import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderEmailHelper } from '../orders/order-email.helper';
import { NotificationService } from '../notifications/notification.service';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentService {
    private stripe: Stripe;
    private readonly logger = new Logger(StripePaymentService.name);

    constructor(
        private prisma: PrismaService,
        private orderEmailHelper: OrderEmailHelper,
        private notificationService: NotificationService,
    ) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }
        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-12-15.clover',
        });
    }

    /**
     * Create Stripe PaymentIntent for an order
     */
    async createPaymentIntent(orderId: string, userId: string) {
        // 1. Fetch and validate order
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
            include: {
                order_items: {
                    include: {
                        products: true,
                    },
                },
                users: true,
            },
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        if (order.buyerId !== userId) {
            throw new UnauthorizedException('You do not own this order');
        }

        // 2. Validate order status - only allow payment for PENDING orders
        if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
            throw new BadRequestException(
                `Order is ${order.status}. Payment can only be made for PENDING or CONFIRMED orders.`
            );
        }

        // 3. Check if already paid
        if (order.paymentStatus === 'PAID') {
            throw new BadRequestException('Order is already paid');
        }

        // 4. Check for existing successful payment
        const existingSuccessful = await this.prisma.payment_transactions.findFirst({
            where: {
                orderId,
                status: 'SUCCEEDED',
            },
        });

        if (existingSuccessful) {
            throw new BadRequestException('Order already has a successful payment');
        }

        // 5. Calculate amount in cents for Stripe
        const amountInCents = Math.round(Number(order.totalCost) * 100);

        // 6. Create Stripe PaymentIntent
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                userId: order.buyerId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // 7. Store payment transaction record
        const paymentTransaction = await this.prisma.payment_transactions.create({
            data: {
                id: `pmt_${crypto.randomUUID()}`,
                orderId: order.id,
                provider: 'STRIPE',
                intentId: paymentIntent.id,
                amount: order.totalCost,
                currency: 'USD',
                status: 'PENDING',
                metadata: JSON.stringify({
                    clientSecret: paymentIntent.client_secret,
                }),
                updatedAt: new Date(),
            },
        });

        this.logger.log(
            `Created PaymentIntent ${paymentIntent.id} for order ${orderId}`
        );

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: Number(order.totalCost),
            currency: 'USD',
        };
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(signature: string, rawBody: Buffer) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
        }

        let event: Stripe.Event;

        try {
            // Verify webhook signature
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret
            );
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException('Invalid webhook signature');
        }

        this.logger.log(`Received webhook event: ${event.type}`);

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.payment_failed':
                await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.canceled':
                await this.handlePaymentCancellation(event.data.object as Stripe.PaymentIntent);
                break;

            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
    }

    /**
     * Handle successful payment
     */
    private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
        const intentId = paymentIntent.id;
        const orderId = paymentIntent.metadata.orderId;

        this.logger.log(`Payment succeeded for intent ${intentId}, order ${orderId}`);

        // Update payment transaction
        await this.prisma.payment_transactions.updateMany({
            where: { intentId },
            data: {
                status: 'SUCCEEDED',
                updatedAt: new Date(),
            },
        });

        // Update order payment status and status
        await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PAID',
                paidAt: new Date(),
                status: 'PAID', // Transition to PAID status
                updatedAt: new Date(),
            },
        });

        this.logger.log(`Order ${orderId} marked as PAID`);

        // Send payment success email (Phase 4B)
        await this.orderEmailHelper.sendPaymentSuccessEmail(orderId);
    }

    /**
     * Handle failed payment
     */
    private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
        const intentId = paymentIntent.id;
        const orderId = paymentIntent.metadata.orderId;
        const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';

        this.logger.warn(`Payment failed for intent ${intentId}: ${failureMessage}`);

        // Update payment transaction
        await this.prisma.payment_transactions.updateMany({
            where: { intentId },
            data: {
                status: 'FAILED',
                failureReason: failureMessage,
                updatedAt: new Date(),
            },
        });

        // Send admin alert for failed payment (Phase 4B)
        await this.notificationService.alertPaymentFailed(orderId, failureMessage);

        // Order remains in PENDING/CONFIRMED status, user can retry
    }

    /**
     * Handle cancelled payment
     */
    private async handlePaymentCancellation(paymentIntent: Stripe.PaymentIntent) {
        const intentId = paymentIntent.id;
        const orderId = paymentIntent.metadata.orderId;

        this.logger.log(`Payment cancelled for intent ${intentId}`);

        // Update payment transaction
        await this.prisma.payment_transactions.updateMany({
            where: { intentId },
            data: {
                status: 'CANCELLED',
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Get payment transactions for an order
     */
    async getOrderPayments(orderId: string, userId?: string) {
        // If userId provided, verify ownership
        if (userId) {
            const order = await this.prisma.orders.findUnique({
                where: { id: orderId },
                select: { buyerId: true },
            });

            if (!order || order.buyerId !== userId) {
                throw new NotFoundException('Order not found');
            }
        }

        return this.prisma.payment_transactions.findMany({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Handle COD (Cash on Delivery) orders
     */
    async markOrderAsAwaitingConfirmation(orderId: string, userId: string) {
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        if (order.buyerId !== userId) {
            throw new UnauthorizedException('You do not own this order');
        }

        if (order.paymentMethod !== 'COD') {
            throw new BadRequestException('Only COD orders can use this method');
        }

        // Update order status to CONFIRMED (awaiting admin confirmation)
        await this.prisma.orders.update({
            where: { id: orderId },
            data: {
                status: 'CONFIRMED',
                confirmedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Send COD confirmation email (Phase 4B)
        await this.orderEmailHelper.sendCODConfirmationEmail(orderId);

        return { success: true, message: 'Order placed successfully. Awaiting confirmation.' };
    }
}
