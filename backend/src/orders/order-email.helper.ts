import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService, OrderEmailData } from '../email/email.service';

@Injectable()
export class OrderEmailHelper {
    private readonly logger = new Logger(OrderEmailHelper.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    /**
     * Send order created email
     */
    async sendOrderCreatedEmail(orderId: string) {
        try {
            const order = await this.getOrderWithDetails(orderId);
            if (!order) {
                this.logger.warn(`Order ${orderId} not found for email`);
                return;
            }

            const emailData = this.buildOrderEmailData(order);
            await this.emailService.sendOrderCreatedEmail(emailData);
        } catch (error) {
            this.logger.error(
                `Failed to send order created email for ${orderId}: ${error.message}`,
            );
        }
    }

    /**
     * Send payment success email
     */
    async sendPaymentSuccessEmail(orderId: string) {
        try {
            const order = await this.getOrderWithDetails(orderId);
            if (!order) {
                this.logger.warn(`Order ${orderId} not found for email`);
                return;
            }

            const emailData = this.buildOrderEmailData(order);
            emailData.paymentMethod = 'Stripe';
            await this.emailService.sendPaymentSuccessEmail(emailData);
        } catch (error) {
            this.logger.error(
                `Failed to send payment success email for ${orderId}: ${error.message}`,
            );
        }
    }

    /**
     * Send COD confirmation email
     */
    async sendCODConfirmationEmail(orderId: string) {
        try {
            const order = await this.getOrderWithDetails(orderId);
            if (!order) {
                this.logger.warn(`Order ${orderId} not found for email`);
                return;
            }

            const emailData = this.buildOrderEmailData(order);
            emailData.paymentMethod = 'Cash on Delivery';
            await this.emailService.sendCODConfirmationEmail(emailData);
        } catch (error) {
            this.logger.error(
                `Failed to send COD confirmation email for ${orderId}: ${error.message}`,
            );
        }
    }

    /**
     * Send order status update email
     */
    async sendOrderStatusEmail(orderId: string, newStatus: string) {
        try {
            // Only send emails for specific statuses
            const emailStatuses = ['PREPARING', 'SHIPPING', 'DELIVERED'];
            if (!emailStatuses.includes(newStatus)) {
                return;
            }

            const order = await this.getOrderWithDetails(orderId);
            if (!order) {
                this.logger.warn(`Order ${orderId} not found for email`);
                return;
            }

            const emailData = this.buildOrderEmailData(order);
            emailData.status = newStatus;
            // Note: trackingNumber field doesn't exist yet - can be added in future
            // emailData.trackingNumber = order.trackingNumber || undefined;

            await this.emailService.sendOrderStatusEmail(emailData, newStatus);
        } catch (error) {
            this.logger.error(
                `Failed to send order status email for ${orderId}: ${error.message}`,
            );
        }
    }

    /**
     * Fetch order with all related data needed for emails
     */
    private async getOrderWithDetails(orderId: string) {
        return this.prisma.orders.findUnique({
            where: { id: orderId },
            include: {
                users: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                order_items: {
                    include: {
                        products: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Build email data from order
     */
    private buildOrderEmailData(order: any): OrderEmailData {
        const fullName =
            order.users?.firstName && order.users?.lastName
                ? `${order.users.firstName} ${order.users.lastName}`
                : order.users?.email?.split('@')[0] || 'Customer';

        const items = order.order_items.map((item: any) => ({
            name: item.productName || item.products?.name || 'Product',
            quantity: item.quantity,
            price: Number(item.productPrice) * item.quantity,
            variant: item.variantId ? 'Variant' : undefined,
        }));

        const emailData: OrderEmailData = {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: fullName,
            customerEmail: order.users?.email || '',
            items,
            totalAmount: Number(order.totalCost),
        };

        // Add shipping address if available
        if (
            order.deliveryAddress ||
            order.deliveryCity ||
            order.deliveryState ||
            order.deliveryZipCode
        ) {
            emailData.shippingAddress = {
                street: order.deliveryAddress || '',
                city: order.deliveryCity || '',
                state: order.deliveryState || '',
                zip: order.deliveryZipCode || '',
                country: 'US',
            };
        }

        return emailData;
    }
}
