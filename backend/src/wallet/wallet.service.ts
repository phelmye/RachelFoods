import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get or create wallet for user
     */
    async getOrCreateWallet(userId: string) {
        let wallet = await this.prisma.store_credit_wallets.findUnique({
            where: { userId },
        });

        if (!wallet) {
            wallet = await this.prisma.store_credit_wallets.create({
                data: {
                    userId,
                    balance: new Decimal(0),
                    updatedAt: new Date(),
                },
            });

            this.logger.log({
                event: 'wallet_created',
                userId,
                walletId: wallet.id,
            });
        }

        return wallet;
    }

    /**
     * Get wallet balance for user
     */
    async getBalance(userId: string): Promise<number> {
        const wallet = await this.getOrCreateWallet(userId);
        return parseFloat(wallet.balance.toString());
    }

    /**
     * Credit wallet (add funds)
     * PHASE 5C: All wallet additions must go through this method
     */
    async creditWallet(
        userId: string,
        amount: number,
        source: 'REFUND' | 'LOYALTY' | 'ADMIN' | 'PROMO',
        reference?: string,
        metadata?: any,
    ) {
        if (amount <= 0) {
            throw new BadRequestException('Credit amount must be positive');
        }

        // Use transaction for atomic operation
        return await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.store_credit_wallets.findUnique({
                where: { userId },
            });

            if (!wallet) {
                // Create wallet if doesn't exist
                const newWallet = await tx.store_credit_wallets.create({
                    data: {
                        userId,
                        balance: new Decimal(amount),
                        updatedAt: new Date(),
                    },
                });

                // Create transaction record
                const transaction = await tx.wallet_transactions.create({
                    data: {
                        walletId: newWallet.id,
                        type: 'CREDIT',
                        source,
                        amount: new Decimal(amount),
                        reference,
                        metadata: metadata ? JSON.stringify(metadata) : null,
                    },
                });

                this.logger.log({
                    event: 'wallet_credited',
                    userId,
                    walletId: newWallet.id,
                    amount,
                    source,
                    reference,
                    transactionId: transaction.id,
                });

                return {
                    wallet: newWallet,
                    transaction,
                    newBalance: parseFloat(newWallet.balance.toString()),
                };
            }

            // Update existing wallet
            const newBalance = wallet.balance.add(new Decimal(amount));
            const updatedWallet = await tx.store_credit_wallets.update({
                where: { id: wallet.id },
                data: {
                    balance: newBalance,
                    updatedAt: new Date(),
                },
            });

            // Create transaction record
            const transaction = await tx.wallet_transactions.create({
                data: {
                    walletId: wallet.id,
                    type: 'CREDIT',
                    source,
                    amount: new Decimal(amount),
                    reference,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                },
            });

            this.logger.log({
                event: 'wallet_credited',
                userId,
                walletId: wallet.id,
                amount,
                source,
                reference,
                previousBalance: parseFloat(wallet.balance.toString()),
                newBalance: parseFloat(newBalance.toString()),
                transactionId: transaction.id,
            });

            return {
                wallet: updatedWallet,
                transaction,
                newBalance: parseFloat(newBalance.toString()),
            };
        });
    }

    /**
     * Debit wallet (subtract funds)
     * PHASE 5C: Prevents overdraft, transaction-safe
     */
    async debitWallet(
        userId: string,
        amount: number,
        source: 'ORDER_PAYMENT',
        reference?: string,
        metadata?: any,
    ) {
        if (amount <= 0) {
            throw new BadRequestException('Debit amount must be positive');
        }

        // Use transaction for atomic operation
        return await this.prisma.$transaction(async (tx) => {
            const wallet = await tx.store_credit_wallets.findUnique({
                where: { userId },
            });

            if (!wallet) {
                throw new NotFoundException('Wallet not found for user');
            }

            // Check sufficient balance
            const currentBalance = parseFloat(wallet.balance.toString());
            if (currentBalance < amount) {
                throw new BadRequestException(
                    `Insufficient wallet balance. Available: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`,
                );
            }

            // Deduct from balance
            const newBalance = wallet.balance.sub(new Decimal(amount));
            const updatedWallet = await tx.store_credit_wallets.update({
                where: { id: wallet.id },
                data: {
                    balance: newBalance,
                    updatedAt: new Date(),
                },
            });

            // Create transaction record
            const transaction = await tx.wallet_transactions.create({
                data: {
                    walletId: wallet.id,
                    type: 'DEBIT',
                    source,
                    amount: new Decimal(amount),
                    reference,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                },
            });

            this.logger.log({
                event: 'wallet_debited',
                userId,
                walletId: wallet.id,
                amount,
                source,
                reference,
                previousBalance: parseFloat(wallet.balance.toString()),
                newBalance: parseFloat(newBalance.toString()),
                transactionId: transaction.id,
            });

            return {
                wallet: updatedWallet,
                transaction,
                newBalance: parseFloat(newBalance.toString()),
            };
        });
    }

    /**
     * Get wallet transaction history
     */
    async getWalletHistory(userId: string, limit = 50) {
        const wallet = await this.getOrCreateWallet(userId);

        const transactions = await this.prisma.wallet_transactions.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return transactions.map((tx) => ({
            id: tx.id,
            type: tx.type,
            source: tx.source,
            amount: parseFloat(tx.amount.toString()),
            reference: tx.reference,
            metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
            createdAt: tx.createdAt,
        }));
    }

    /**
     * Get wallet details with balance and recent transactions
     */
    async getWalletDetails(userId: string) {
        const wallet = await this.getOrCreateWallet(userId);
        const recentTransactions = await this.getWalletHistory(userId, 10);

        return {
            id: wallet.id,
            userId: wallet.userId,
            balance: parseFloat(wallet.balance.toString()),
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
            recentTransactions,
        };
    }

    /**
     * Admin: Get wallet for any user
     */
    async getWalletByUserId(userId: string) {
        const wallet = await this.prisma.store_credit_wallets.findUnique({
            where: { userId },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!wallet) {
            throw new NotFoundException(`Wallet not found for user ${userId}`);
        }

        return {
            ...wallet,
            balance: parseFloat(wallet.balance.toString()),
        };
    }

    /**
     * Admin: Get full transaction history for a user
     */
    async getFullHistory(userId: string) {
        const wallet = await this.getOrCreateWallet(userId);

        const transactions = await this.prisma.wallet_transactions.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
        });

        return transactions.map((tx) => ({
            id: tx.id,
            type: tx.type,
            source: tx.source,
            amount: parseFloat(tx.amount.toString()),
            reference: tx.reference,
            metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
            createdAt: tx.createdAt,
        }));
    }
}
