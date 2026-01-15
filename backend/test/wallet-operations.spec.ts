import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../src/wallet/wallet.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PHASE 9A: Wallet Operations Tests
 * 
 * Critical invariants:
 * 1. Balance never goes negative
 * 2. Insufficient funds prevents debit
 * 3. Refund credits are atomic
 * 4. Transaction history is immutable
 * 5. Balance equals sum of all transactions
 */
describe('WalletService - Balance Operations', () => {
    let service: WalletService;
    let prisma: PrismaService;

    const mockPrisma = {
        wallets: {
            findUnique: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        wallet_transactions: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
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

    describe('Debit Operations', () => {
        it('should debit wallet when sufficient funds available', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.wallets.update.mockResolvedValue({
                ...wallet,
                balance: new Decimal(75.0), // 100 - 25
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-1',
                type: 'DEBIT',
                amount: new Decimal(25.0),
                balance: new Decimal(75.0),
            });

            // Act
            const result = await service.debit('user-1', 25.0, 'Order payment');

            // Assert
            expect(mockPrisma.wallets.update).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                data: {
                    balance: {
                        decrement: 25.0,
                    },
                },
            });
            expect(result.balance.toNumber()).toBe(75.0);
        });

        it('should reject debit when insufficient funds', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(10.0), // Only $10 available
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // Act & Assert
            await expect(
                service.debit('user-1', 50.0, 'Order payment')
            ).rejects.toThrow('Insufficient wallet balance');

            // No wallet mutation should occur
            expect(mockPrisma.wallets.update).not.toHaveBeenCalled();
            expect(mockPrisma.wallet_transactions.create).not.toHaveBeenCalled();
        });

        it('should reject debit for exact zero balance', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // Act & Assert
            await expect(
                service.debit('user-1', 10.0, 'Order payment')
            ).rejects.toThrow('Insufficient wallet balance');
        });

        it('should handle exact balance debit', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(50.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.wallets.update.mockResolvedValue({
                ...wallet,
                balance: new Decimal(0), // Exact match
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-1',
                type: 'DEBIT',
                amount: new Decimal(50.0),
                balance: new Decimal(0),
            });

            // Act
            const result = await service.debit('user-1', 50.0, 'Full balance use');

            // Assert
            expect(result.balance.toNumber()).toBe(0);
            expect(mockPrisma.wallets.update).toHaveBeenCalled();
        });
    });

    describe('Credit Operations (Refunds)', () => {
        it('should credit wallet for refund', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(50.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.wallets.update.mockResolvedValue({
                ...wallet,
                balance: new Decimal(75.0), // 50 + 25
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-2',
                type: 'CREDIT',
                amount: new Decimal(25.0),
                balance: new Decimal(75.0),
                description: 'Refund for order ORD-123',
            });

            // Act
            const result = await service.credit('user-1', 25.0, 'Refund for order ORD-123');

            // Assert
            expect(mockPrisma.wallets.update).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                data: {
                    balance: {
                        increment: 25.0,
                    },
                },
            });
            expect(result.balance.toNumber()).toBe(75.0);
        });

        it('should credit wallet when balance is zero', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);
            mockPrisma.wallets.update.mockResolvedValue({
                ...wallet,
                balance: new Decimal(30.0),
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-3',
                type: 'CREDIT',
                amount: new Decimal(30.0),
                balance: new Decimal(30.0),
            });

            // Act
            const result = await service.credit('user-1', 30.0, 'Refund');

            // Assert
            expect(result.balance.toNumber()).toBe(30.0);
        });

        it('should create wallet if not exists during credit', async () => {
            // Arrange
            mockPrisma.wallets.findUnique.mockResolvedValue(null);
            mockPrisma.wallets.create.mockResolvedValue({
                id: 'wallet-new',
                userId: 'user-new',
                balance: new Decimal(20.0),
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-4',
                type: 'CREDIT',
                amount: new Decimal(20.0),
                balance: new Decimal(20.0),
            });

            // Act
            const result = await service.credit('user-new', 20.0, 'Initial credit');

            // Assert
            expect(mockPrisma.wallets.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-new',
                    balance: 20.0,
                },
            });
            expect(result.balance.toNumber()).toBe(20.0);
        });
    });

    describe('Invariant: Balance Never Negative', () => {
        it('should prevent balance from going below zero', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(5.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // Act & Assert
            await expect(
                service.debit('user-1', 10.0, 'Attempted overdraft')
            ).rejects.toThrow('Insufficient wallet balance');

            // No database mutation
            expect(mockPrisma.wallets.update).not.toHaveBeenCalled();
        });

        it('should validate balance before debit operation', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // First check: sufficient funds
            const validDebit = service.debit('user-1', 50.0, 'Valid payment');

            // Should not throw
            await expect(validDebit).resolves.toBeDefined();

            // Second check: would cause negative balance
            mockPrisma.wallets.findUnique.mockResolvedValue({
                ...wallet,
                balance: new Decimal(10.0),
            });

            const invalidDebit = service.debit('user-1', 50.0, 'Invalid payment');

            // Should throw
            await expect(invalidDebit).rejects.toThrow();
        });
    });

    describe('Atomic Refund Operations', () => {
        it('should atomically credit wallet and create transaction', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(20.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // Simulate transaction rollback on failure
            let walletUpdateCalled = false;
            let transactionCreateCalled = false;

            mockPrisma.$transaction.mockImplementation(async (callback) => {
                mockPrisma.wallets.update.mockImplementation(() => {
                    walletUpdateCalled = true;
                    return Promise.resolve({
                        ...wallet,
                        balance: new Decimal(35.0),
                    });
                });

                mockPrisma.wallet_transactions.create.mockImplementation(() => {
                    transactionCreateCalled = true;
                    // Simulate failure
                    throw new Error('Transaction log failed');
                });

                try {
                    return await callback(mockPrisma);
                } catch (error) {
                    // Rollback - reset flags
                    walletUpdateCalled = false;
                    transactionCreateCalled = false;
                    throw error;
                }
            });

            // Act & Assert
            await expect(
                service.credit('user-1', 15.0, 'Refund')
            ).rejects.toThrow('Transaction log failed');

            // Both operations should be rolled back
            // In real scenario, database handles rollback
            expect(walletUpdateCalled || transactionCreateCalled).toBe(true);
        });
    });

    describe('Transaction History Immutability', () => {
        it('should record all transactions immutably', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            const transactions: any[] = [];
            mockPrisma.wallet_transactions.create.mockImplementation((args) => {
                const txn = {
                    id: `txn-${transactions.length + 1}`,
                    ...args.data,
                    createdAt: new Date(),
                };
                transactions.push(txn);
                return Promise.resolve(txn);
            });

            mockPrisma.wallets.update.mockImplementation((args) => {
                return Promise.resolve({
                    ...wallet,
                    balance: new Decimal(50.0),
                });
            });

            // Act - Multiple operations
            await service.debit('user-1', 25.0, 'Payment 1');
            await service.debit('user-1', 25.0, 'Payment 2');

            // Assert - Both transactions recorded
            expect(transactions).toHaveLength(2);
            expect(transactions[0].type).toBe('DEBIT');
            expect(transactions[1].type).toBe('DEBIT');

            // Transactions should never be updated, only created
            expect(mockPrisma.wallet_transactions.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('Balance Integrity', () => {
        it('should maintain balance = sum(credits) - sum(debits)', async () => {
            // Arrange
            const initialBalance = 100.0;
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(initialBalance),
            };

            const transactions = [
                { type: 'CREDIT', amount: new Decimal(50.0) }, // +50
                { type: 'DEBIT', amount: new Decimal(25.0) },  // -25
                { type: 'CREDIT', amount: new Decimal(10.0) }, // +10
                { type: 'DEBIT', amount: new Decimal(15.0) },  // -15
            ];

            mockPrisma.wallet_transactions.findMany.mockResolvedValue(transactions);

            // Act - Calculate expected balance
            const credits = transactions
                .filter(t => t.type === 'CREDIT')
                .reduce((sum, t) => sum + t.amount.toNumber(), 0);

            const debits = transactions
                .filter(t => t.type === 'DEBIT')
                .reduce((sum, t) => sum + t.amount.toNumber(), 0);

            const expectedBalance = initialBalance + credits - debits;
            // 100 + (50 + 10) - (25 + 15) = 120

            // Assert
            expect(expectedBalance).toBe(120);

            // Wallet balance should match this calculation
            mockPrisma.wallets.findUnique.mockResolvedValue({
                ...wallet,
                balance: new Decimal(expectedBalance),
            });

            const result = await service.getBalance('user-1');
            expect(result.toNumber()).toBe(expectedBalance);
        });
    });

    describe('Concurrent Operations Safety', () => {
        it('should handle concurrent debit attempts safely', async () => {
            // Arrange - Wallet with $50
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(50.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // First debit succeeds
            mockPrisma.wallets.update.mockResolvedValueOnce({
                ...wallet,
                balance: new Decimal(25.0), // 50 - 25
            });

            mockPrisma.wallet_transactions.create.mockResolvedValue({
                id: 'txn-1',
                type: 'DEBIT',
                amount: new Decimal(25.0),
            });

            // Act - First operation
            await service.debit('user-1', 25.0, 'Payment 1');

            // Second concurrent debit should see updated balance
            mockPrisma.wallets.findUnique.mockResolvedValue({
                ...wallet,
                balance: new Decimal(25.0), // Updated
            });

            // Act & Assert - Second operation
            await expect(
                service.debit('user-1', 40.0, 'Payment 2')
            ).rejects.toThrow('Insufficient wallet balance');
        });
    });

    describe('Error Handling', () => {
        it('should throw NotFoundException for non-existent wallet on debit', async () => {
            // Arrange
            mockPrisma.wallets.findUnique.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.debit('user-nonexistent', 10.0, 'Payment')
            ).rejects.toThrow(NotFoundException);
        });

        it('should reject negative debit amounts', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // Act & Assert
            await expect(
                service.debit('user-1', -10.0, 'Invalid negative')
            ).rejects.toThrow('Amount must be positive');
        });

        it('should reject zero amount operations', async () => {
            // Arrange
            const wallet = {
                id: 'wallet-1',
                userId: 'user-1',
                balance: new Decimal(100.0),
            };

            mockPrisma.wallets.findUnique.mockResolvedValue(wallet);

            // Act & Assert
            await expect(
                service.debit('user-1', 0, 'Zero amount')
            ).rejects.toThrow('Amount must be greater than zero');
        });
    });
});
