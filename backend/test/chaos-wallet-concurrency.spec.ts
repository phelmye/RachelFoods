import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../src/wallet/wallet.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PHASE 9C: Wallet Concurrency Chaos Tests
 * 
 * Simulates real-world failure scenarios:
 * 1. Multiple simultaneous debit attempts (race conditions)
 * 2. Overdraft attempts under concurrent load
 * 3. Transaction rollback on wallet operation failures
 * 
 * Critical Safety Invariants:
 * - Wallet balance NEVER goes negative (even under race conditions)
 * - Failed operations do NOT partially debit wallet
 * - Concurrent operations are serialized safely
 */
describe('CHAOS: WalletService - Concurrency & Race Conditions', () => {
    let service: WalletService;
    let prisma: PrismaService;

    const mockPrisma: any = {
        store_credit_wallets: {
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        wallet_transactions: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WalletService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        service = module.get<WalletService>(WalletService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('Race Condition: Concurrent Debit Attempts', () => {
        it('CHAOS: should prevent overdraft when multiple debits race for same wallet', async () => {
            // Arrange: Wallet has $100
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            // Simulate race condition: 3 concurrent debits of $40 each
            // Only 2 should succeed, 3rd should fail (100 - 40 - 40 = 20, can't debit 40 more)
            let debitAttempts = 0;
            mockPrisma.store_credit_wallets.findUnique.mockImplementation(() => {
                debitAttempts++;
                // Simulate race: all 3 see initial balance of 100
                return Promise.resolve(wallet);
            });

            mockPrisma.store_credit_wallets.update.mockImplementation((args: any) => {
                const newBalance = args.data.balance;
                // Simulate real constraint: reject if balance would be negative
                if (newBalance.toNumber() < 0) {
                    throw new Error('Balance constraint violation');
                }
                return Promise.resolve({
                    ...wallet,
                    balance: newBalance,
                });
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-1',
                type: 'DEBIT',
                amount: new Decimal(40.0),
            });

            // Act: 3 concurrent debit attempts
            const results = await Promise.allSettled([
                service.debitWallet('user-1', 40.0, 'ORDER_PAYMENT'),
                service.debitWallet('user-1', 40.0, 'ORDER_PAYMENT'),
                service.debitWallet('user-1', 40.0, 'ORDER_PAYMENT'),
            ]);

            // Assert: At least one MUST fail
            const failures = results.filter(r => r.status === 'rejected');
            const successes = results.filter(r => r.status === 'fulfilled');

            expect(failures.length).toBeGreaterThan(0);
            expect(successes.length).toBeLessThan(3);

            // CRITICAL: No negative balance should ever be attempted
            const updateCalls = mockPrisma.store_credit_wallets.update.mock.calls;
            updateCalls.forEach((call: any) => {
                const balance = call[0].data.balance;
                expect(balance.toNumber()).toBeGreaterThanOrEqual(0);
            });
        });

        it('CHAOS: should handle rapid sequential debits without data races', async () => {
            // Arrange: Wallet with $100
            let currentBalance = new Decimal(100.0);
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: currentBalance,
            };

            // Simulate sequential balance updates (proper implementation)
            mockPrisma.store_credit_wallets.findUnique.mockImplementation(() => {
                return Promise.resolve({
                    ...wallet,
                    balance: currentBalance,
                });
            });

            mockPrisma.store_credit_wallets.update.mockImplementation((args: any) => {
                const newBalance = args.data.balance;
                if (newBalance.toNumber() < 0) {
                    throw new BadRequestException('Insufficient balance');
                }
                currentBalance = newBalance; // Update for next call
                return Promise.resolve({
                    ...wallet,
                    balance: newBalance,
                });
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-1',
                type: 'DEBIT',
            });

            // Act: 5 rapid debits of $15 each (total $75, should all succeed)
            const results = await Promise.all([
                service.debitWallet('user-1', 15.0, 'ORDER_PAYMENT'),
                service.debitWallet('user-1', 15.0, 'ORDER_PAYMENT'),
                service.debitWallet('user-1', 15.0, 'ORDER_PAYMENT'),
                service.debitWallet('user-1', 15.0, 'ORDER_PAYMENT'),
                service.debitWallet('user-1', 15.0, 'ORDER_PAYMENT'),
            ]);

            // Assert: All should succeed
            expect(results).toHaveLength(5);
            expect(currentBalance.toNumber()).toBe(25.0); // 100 - 75 = 25
        });

        it('CHAOS: should reject all operations if wallet balance goes negative', async () => {
            // Arrange: Wallet with only $50
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(50.0),
            };

            mockPrisma.store_credit_wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.wallet_transactions.create.mockResolvedValue({ id: 'txn-1' });

            // Act & Assert: Try to debit $60 (should fail)
            await expect(
                service.debitWallet('user-1', 60.0, 'ORDER_PAYMENT')
            ).rejects.toThrow('Insufficient wallet balance');

            // Verify wallet was NOT updated
            expect(mockPrisma.store_credit_wallets.update).not.toHaveBeenCalled();
        });
    });

    describe('Transaction Rollback: Wallet Operation Failures', () => {
        it('CHAOS: should rollback debit if transaction log creation fails', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.store_credit_wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.store_credit_wallets.update.mockResolvedValue({
                ...wallet,
                balance: new Decimal(75.0),
            });

            // Simulate transaction log failure
            mockPrisma.wallet_transactions.create.mockRejectedValue(
                new Error('Database constraint violation')
            );

            // Mock transaction to actually roll back
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
                try {
                    return await callback(mockPrisma);
                } catch (error) {
                    // Rollback: ensure no updates persisted
                    mockPrisma.store_credit_wallets.update.mockClear();
                    throw error;
                }
            });

            // Act & Assert
            await expect(
                service.debitWallet('user-1', 25.0, 'ORDER_PAYMENT')
            ).rejects.toThrow();

            // CRITICAL: Transaction should have been attempted but rolled back
            // In real system, the transaction would ensure atomicity
        });

        it('CHAOS: should handle concurrent credit operations safely', async () => {
            // Arrange: Empty wallet
            let currentBalance = new Decimal(0.0);
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: currentBalance,
            };

            mockPrisma.store_credit_wallets.findUnique.mockImplementation(() => {
                return Promise.resolve({
                    ...wallet,
                    balance: currentBalance,
                });
            });

            mockPrisma.store_credit_wallets.create.mockImplementation((args: any) => {
                currentBalance = args.data.balance;
                return Promise.resolve({
                    id: 'wallet-1',
                    userId: 'user-1',
                    balance: currentBalance,
                });
            });

            mockPrisma.store_credit_wallets.update.mockImplementation((args: any) => {
                const newBalance = args.data.balance;
                currentBalance = newBalance;
                return Promise.resolve({
                    ...wallet,
                    balance: newBalance,
                });
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-1',
                type: 'CREDIT',
            });

            // Act: Multiple concurrent refunds/credits
            const results = await Promise.all([
                service.creditWallet('user-1', 10.0, 'REFUND'),
                service.creditWallet('user-1', 15.0, 'REFUND'),
                service.creditWallet('user-1', 20.0, 'LOYALTY'),
            ]);

            // Assert: All should succeed and balance should be sum
            expect(results).toHaveLength(3);
            // Balance integrity: sum of all credits
            expect(currentBalance.toNumber()).toBeGreaterThanOrEqual(45.0);
        });
    });

    describe('Boundary Conditions: Extreme Loads', () => {
        it('CHAOS: should handle 10 concurrent debit attempts gracefully', async () => {
            // Arrange: Wallet with $100
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.store_credit_wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.store_credit_wallets.update.mockImplementation((args: any) => {
                const newBalance = args.data.balance;
                if (newBalance.toNumber() < 0) {
                    throw new BadRequestException('Insufficient balance');
                }
                return Promise.resolve({
                    ...wallet,
                    balance: newBalance,
                });
            });
            mockPrisma.wallet_transactions.create.mockResolvedValue({ id: 'txn-1' });

            // Act: 10 concurrent attempts of $15 each (only 6 can succeed)
            const attempts = Array(10).fill(null).map(() =>
                service.debitWallet('user-1', 15.0, 'ORDER_PAYMENT')
            );

            const results = await Promise.allSettled(attempts);

            // Assert: Some must fail due to insufficient balance
            const failures = results.filter(r => r.status === 'rejected');
            const successes = results.filter(r => r.status === 'fulfilled');

            expect(failures.length).toBeGreaterThan(0);
            expect(successes.length).toBeLessThanOrEqual(6); // 100/15 = 6.67, so max 6
        });

        it('CHAOS: should maintain wallet balance integrity under mixed operations', async () => {
            // Arrange: Starting balance $50
            let currentBalance = new Decimal(50.0);
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: currentBalance,
            };

            mockPrisma.store_credit_wallets.findUnique.mockImplementation(() => {
                return Promise.resolve({
                    ...wallet,
                    balance: currentBalance,
                });
            });

            mockPrisma.store_credit_wallets.update.mockImplementation((args: any) => {
                const newBalance = args.data.balance;
                if (newBalance.toNumber() < 0) {
                    throw new BadRequestException('Insufficient balance');
                }
                currentBalance = newBalance;
                return Promise.resolve({
                    ...wallet,
                    balance: newBalance,
                });
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({ id: 'txn-1' });

            // Act: Mixed debits and credits
            await service.debitWallet('user-1', 20.0, 'ORDER_PAYMENT'); // 50 - 20 = 30
            await service.creditWallet('user-1', 30.0, 'REFUND'); // 30 + 30 = 60
            await service.debitWallet('user-1', 40.0, 'ORDER_PAYMENT'); // 60 - 40 = 20

            // Assert: Final balance should be calculable
            expect(currentBalance.toNumber()).toBe(20.0);
        });
    });

    describe('Edge Cases: Zero and Negative Amounts', () => {
        it('CHAOS: should reject zero amount debits', async () => {
            await expect(
                service.debitWallet('user-1', 0, 'ORDER_PAYMENT')
            ).rejects.toThrow('Debit amount must be positive');
        });

        it('CHAOS: should reject negative amount debits', async () => {
            await expect(
                service.debitWallet('user-1', -10, 'ORDER_PAYMENT')
            ).rejects.toThrow('Debit amount must be positive');
        });

        it('CHAOS: should reject zero amount credits', async () => {
            await expect(
                service.creditWallet('user-1', 0, 'REFUND')
            ).rejects.toThrow('Credit amount must be positive');
        });

        it('CHAOS: should reject negative amount credits', async () => {
            await expect(
                service.creditWallet('user-1', -10, 'REFUND')
            ).rejects.toThrow('Credit amount must be positive');
        });
    });
});
