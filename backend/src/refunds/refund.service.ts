import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RefundService {
    private readonly logger = new Logger(RefundService.name);

    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
    ) { }

    /**
     * Process refund and credit wallet
     * PHASE 5C: All refunds credit the user's wallet
     */
    async processRefund(
        orderId: string,
        adminId: string,
        refundAmount?: number, // Optional for partial refunds
        reason?: string,
    ) {
        // Get order
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            include: {
                users: true,
                payments: true, // Include payment if exists
            },
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Validate refund amount
        const maxRefundable = parseFloat(order.totalCost.toString()) + parseFloat(order.walletUsed.toString());
        const actualRefundAmount = refundAmount || maxRefundable;

        if (actualRefundAmount > maxRefundable) {
            throw new BadRequestException(
                `Refund amount cannot exceed order total. Maximum: $${maxRefundable.toFixed(2)}`,
            );
        }

        if (actualRefundAmount <= 0) {
            throw new BadRequestException('Refund amount must be positive');
        }

        // Create refund record
        const refund = await this.prisma.refunds.create({
            data: {
                id: `ref_${crypto.randomUUID()}`,
                paymentId: order.payments?.id || 'no_payment', // Handle COD
                orderId: order.id,
                amount: new Decimal(actualRefundAmount),
                reason: reason || 'Order refunded',
                issuerWalletId: adminId, // Admin wallet ID (placeholder)
                recipientWalletId: order.buyerId, // User ID as wallet recipient
                requestedBy: adminId,
                requestedAt: new Date(),
                approvedBy: adminId,
                approvedAt: new Date(),
                status: 'COMPLETED',
                completedAt: new Date(),
                processedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Credit user's wallet
        const walletCredit = await this.walletService.creditWallet(
            order.buyerId,
            actualRefundAmount,
            'REFUND',
            order.id,
            {
                refundId: refund.id,
                orderNumber: order.orderNumber,
                refundAmount: actualRefundAmount,
                originalOrderTotal: maxRefundable,
                paymentMethod: order.paymentMethod,
                adminId,
                reason,
            },
        );

        // Update order status
        await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancellationReason: reason || 'Refunded',
                updatedAt: new Date(),
            },
        });

        this.logger.log({
            event: 'refund_processed',
            orderId: order.id,
            orderNumber: order.orderNumber,
            buyerId: order.buyerId,
            refundAmount: actualRefundAmount,
            walletCredited: walletCredit.newBalance,
            refundId: refund.id,
            adminId,
        });

        return {
            refundId: refund.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            refundAmount: actualRefundAmount,
            walletCredited: walletCredit.newBalance,
            transactionId: walletCredit.transaction.id,
        };
    }

    /**
     * Get refund details
     */
    async getRefund(refundId: string) {
        const refund = await this.prisma.refunds.findUnique({
            where: { id: refundId },
            include: {
                orders: {
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
                },
            },
        });

        if (!refund) {
            throw new NotFoundException(`Refund ${refundId} not found`);
        }

        return {
            ...refund,
            amount: parseFloat(refund.amount.toString()),
        };
    }

    /**
     * List refunds for an order
     */
    async getRefundsByOrder(orderId: string) {
        const refunds = await this.prisma.refunds.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
        });

        return refunds.map((r) => ({
            ...r,
            amount: parseFloat(r.amount.toString()),
        }));
    }

    /**
     * List all refunds (admin)
     */
    async getAllRefunds(limit = 100) {
        const refunds = await this.prisma.refunds.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                orders: {
                    select: {
                        orderNumber: true,
                        buyerId: true,
                    },
                },
            },
        });

        return refunds.map((r) => ({
            ...r,
            amount: parseFloat(r.amount.toString()),
        }));
    }
}
