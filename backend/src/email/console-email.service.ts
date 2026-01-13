import { Injectable, Logger } from '@nestjs/common';
import {
    EmailService,
    OrderEmailData,
    RefillReminderData,
} from './email.service';

@Injectable()
export class ConsoleEmailService extends EmailService {
    private readonly logger = new Logger(ConsoleEmailService.name);

    async sendOrderCreatedEmail(data: OrderEmailData): Promise<void> {
        this.logger.log('📧 [EMAIL] Order Created');
        this.logger.log(`To: ${data.customerEmail}`);
        this.logger.log(`Subject: Your order #${data.orderNumber} has been received`);
        this.logger.log(`Order ID: ${data.orderId}`);
        this.logger.log(
            `Items: ${data.items.length} item(s), Total: ${this.formatCurrency(data.totalAmount)}`,
        );
        this.logger.log('---');
    }

    async sendPaymentSuccessEmail(data: OrderEmailData): Promise<void> {
        this.logger.log('📧 [EMAIL] Payment Successful');
        this.logger.log(`To: ${data.customerEmail}`);
        this.logger.log(`Subject: Payment confirmed for order #${data.orderNumber}`);
        this.logger.log(`Amount Paid: ${this.formatCurrency(data.totalAmount)}`);
        this.logger.log(`Payment Method: ${data.paymentMethod || 'Card'}`);
        this.logger.log('---');
    }

    async sendCODConfirmationEmail(data: OrderEmailData): Promise<void> {
        this.logger.log('📧 [EMAIL] COD Order Confirmed');
        this.logger.log(`To: ${data.customerEmail}`);
        this.logger.log(`Subject: Order #${data.orderNumber} confirmed (Cash on Delivery)`);
        this.logger.log(`COD Amount: ${this.formatCurrency(data.totalAmount)}`);
        this.logger.log('Note: Please keep exact cash ready at delivery');
        this.logger.log('---');
    }

    async sendOrderStatusEmail(
        data: OrderEmailData,
        newStatus: string,
    ): Promise<void> {
        this.logger.log(`📧 [EMAIL] Order Status Update: ${newStatus}`);
        this.logger.log(`To: ${data.customerEmail}`);
        this.logger.log(`Subject: Order #${data.orderNumber} is now ${newStatus}`);

        if (newStatus === 'PREPARING') {
            this.logger.log('Message: Your order is being prepared');
        } else if (newStatus === 'SHIPPING') {
            this.logger.log('Message: Your order has been shipped');
            if (data.trackingNumber) {
                this.logger.log(`Tracking: ${data.trackingNumber}`);
            }
        } else if (newStatus === 'DELIVERED') {
            this.logger.log('Message: Your order has been delivered');
        }

        this.logger.log('---');
    }

    async sendRefillReminderEmail(data: RefillReminderData): Promise<void> {
        this.logger.log('📧 [EMAIL] Refill Reminder');
        this.logger.log(`To: ${data.customerEmail}`);
        this.logger.log(`Subject: Time to refill: ${data.productName}`);
        this.logger.log(`Last Ordered: ${this.formatDate(data.lastOrderedAt)}`);
        this.logger.log(`Quantity: ${data.quantity}`);
        this.logger.log(
            'Message: Your favorite product might be running low. Ready to reorder?',
        );
        this.logger.log('---');
    }

    async sendAdminAlertEmail(
        adminEmail: string,
        subject: string,
        message: string,
        metadata?: any,
    ): Promise<void> {
        this.logger.warn('🚨 [ADMIN ALERT EMAIL]');
        this.logger.warn(`To: ${adminEmail}`);
        this.logger.warn(`Subject: ${subject}`);
        this.logger.warn(`Message: ${message}`);
        if (metadata) {
            this.logger.warn(`Metadata: ${JSON.stringify(metadata, null, 2)}`);
        }
        this.logger.warn('---');
    }
}
