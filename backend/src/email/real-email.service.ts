import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EmailService,
    OrderEmailData,
    RefillReminderData,
} from './email.service';

/**
 * RealEmailService - Production email service
 * 
 * To use with Resend:
 * 1. npm install resend
 * 2. Add RESEND_API_KEY to .env
 * 3. Uncomment Resend import and initialization
 * 
 * To use with SendGrid:
 * 1. npm install @sendgrid/mail
 * 2. Add SENDGRID_API_KEY to .env
 * 3. Uncomment SendGrid import and initialization
 */
@Injectable()
export class RealEmailService extends EmailService {
    private readonly logger = new Logger(RealEmailService.name);
    private readonly fromEmail: string;
    private readonly supportEmail: string;
    // private resend: Resend; // Uncomment when using Resend
    // private sgMail: any; // Uncomment when using SendGrid

    constructor(private configService: ConfigService) {
        super();
        this.fromEmail = this.configService.get<string>(
            'EMAIL_FROM',
            'noreply@rachelfood.com',
        );
        this.supportEmail = this.configService.get<string>(
            'EMAIL_SUPPORT',
            'support@rachelfood.com',
        );

        // Initialize email provider (currently disabled)
        // this.initializeProvider();
    }

    private initializeProvider() {
        const provider = this.configService.get<string>('EMAIL_PROVIDER', 'none');

        if (provider === 'resend') {
            // Uncomment when Resend is installed
            // const apiKey = this.configService.get<string>('RESEND_API_KEY');
            // this.resend = new Resend(apiKey);
            this.logger.log('Resend email provider initialized');
        } else if (provider === 'sendgrid') {
            // Uncomment when SendGrid is installed
            // const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
            // this.sgMail = require('@sendgrid/mail');
            // this.sgMail.setApiKey(apiKey);
            this.logger.log('SendGrid email provider initialized');
        }
    }

    async sendOrderCreatedEmail(data: OrderEmailData): Promise<void> {
        const subject = `Order Received - #${data.orderNumber}`;
        const html = this.buildOrderCreatedTemplate(data);

        await this.sendEmail(data.customerEmail, subject, html);
    }

    async sendPaymentSuccessEmail(data: OrderEmailData): Promise<void> {
        const subject = `Payment Confirmed - Order #${data.orderNumber}`;
        const html = this.buildPaymentSuccessTemplate(data);

        await this.sendEmail(data.customerEmail, subject, html);
    }

    async sendCODConfirmationEmail(data: OrderEmailData): Promise<void> {
        const subject = `Order Confirmed - #${data.orderNumber} (Cash on Delivery)`;
        const html = this.buildCODConfirmationTemplate(data);

        await this.sendEmail(data.customerEmail, subject, html);
    }

    async sendOrderStatusEmail(
        data: OrderEmailData,
        newStatus: string,
    ): Promise<void> {
        const statusTexts: Record<string, string> = {
            PREPARING: 'Being Prepared',
            SHIPPING: 'Shipped',
            DELIVERED: 'Delivered',
        };

        const subject = `Order ${statusTexts[newStatus] || newStatus} - #${data.orderNumber}`;
        const html = this.buildOrderStatusTemplate(data, newStatus);

        await this.sendEmail(data.customerEmail, subject, html);
    }

    async sendRefillReminderEmail(data: RefillReminderData): Promise<void> {
        const subject = `Time to Refill: ${data.productName}`;
        const html = this.buildRefillReminderTemplate(data);

        await this.sendEmail(data.customerEmail, subject, html);
    }

    async sendAdminAlertEmail(
        adminEmail: string,
        subject: string,
        message: string,
        metadata?: any,
    ): Promise<void> {
        const html = this.buildAdminAlertTemplate(subject, message, metadata);

        await this.sendEmail(adminEmail, `[ADMIN ALERT] ${subject}`, html);
    }

    /**
     * Core email sending method - provider-agnostic
     */
    private async sendEmail(
        to: string,
        subject: string,
        html: string,
    ): Promise<void> {
        try {
            const provider = this.configService.get<string>('EMAIL_PROVIDER', 'none');

            if (provider === 'resend') {
                await this.sendViaResend(to, subject, html);
            } else if (provider === 'sendgrid') {
                await this.sendViaSendGrid(to, subject, html);
            } else {
                // Fallback: log to console
                this.logger.warn(
                    `Email provider not configured. Would send to ${to}: ${subject}`,
                );
            }
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}: ${error.message}`);
            // Don't throw - email failures should not break order flow
        }
    }

    private async sendViaResend(
        to: string,
        subject: string,
        html: string,
    ): Promise<void> {
        // Uncomment when Resend is installed
        /*
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        */
        this.logger.log(`[Resend] Would send email to ${to}: ${subject}`);
    }

    private async sendViaSendGrid(
        to: string,
        subject: string,
        html: string,
    ): Promise<void> {
        // Uncomment when SendGrid is installed
        /*
        await this.sgMail.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        */
        this.logger.log(`[SendGrid] Would send email to ${to}: ${subject}`);
    }

    // ============================================================
    // Email Templates
    // ============================================================

    private buildOrderCreatedTemplate(data: OrderEmailData): string {
        const itemsList = data.items
            .map(
                (item) =>
                    `<li>${item.quantity}x ${item.name}${item.variant ? ` (${item.variant})` : ''} - ${this.formatCurrency(item.price)}</li>`,
            )
            .join('');

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          ul { list-style: none; padding: 0; }
          li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Received</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your order! We've received your order and it's being reviewed by our seller.</p>
            
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber}</p>
            
            <h3>Items Ordered</h3>
            <ul>${itemsList}</ul>
            
            <p><strong>Total:</strong> ${this.formatCurrency(data.totalAmount)}</p>
            
            ${data.shippingAddress ? `
              <h3>Delivery Address</h3>
              <p>
                ${data.shippingAddress.street}<br>
                ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}<br>
                ${data.shippingAddress.country}
              </p>
            ` : ''}
            
            <p><strong>What's Next?</strong></p>
            <ol>
              <li>Seller confirms your order</li>
              <li>Payment is processed</li>
              <li>Your order is prepared and shipped</li>
              <li>You receive delivery updates via email</li>
            </ol>
            
            <p>We'll keep you updated every step of the way!</p>
          </div>
          <div class="footer">
            <p>Need help? Contact us at ${this.supportEmail}</p>
            <p>RachelFoods - Authentic Traditional Foods, Delivered Across the U.S.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private buildPaymentSuccessTemplate(data: OrderEmailData): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed!</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <p>Hi ${data.customerName},</p>
            <p>Your payment has been successfully processed!</p>
            
            <h3>Payment Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>Amount Paid:</strong> ${this.formatCurrency(data.totalAmount)}</p>
            <p><strong>Payment Method:</strong> ${data.paymentMethod || 'Card'}</p>
            
            <p>Your order is now being prepared for shipment. We'll send you another email when it ships.</p>
          </div>
          <div class="footer">
            <p>Need help? Contact us at ${this.supportEmail}</p>
            <p>RachelFoods - Authentic Traditional Foods, Delivered Across the U.S.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private buildCODConfirmationTemplate(data: OrderEmailData): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Your Cash on Delivery order has been confirmed!</p>
            
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber}</p>
            <p><strong>Total Amount (COD):</strong> ${this.formatCurrency(data.totalAmount)}</p>
            
            <div class="highlight">
              <strong>💵 Cash on Delivery</strong><br>
              Please keep exact cash amount ready at the time of delivery.
            </div>
            
            ${data.shippingAddress ? `
              <h3>Delivery Address</h3>
              <p>
                ${data.shippingAddress.street}<br>
                ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
              </p>
            ` : ''}
            
            <p>Your order is now being prepared. We'll notify you when it ships.</p>
          </div>
          <div class="footer">
            <p>Need help? Contact us at ${this.supportEmail}</p>
            <p>RachelFoods - Authentic Traditional Foods, Delivered Across the U.S.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private buildOrderStatusTemplate(
        data: OrderEmailData,
        newStatus: string,
    ): string {
        const statusConfig: Record<
            string,
            { emoji: string; title: string; message: string; color: string }
        > = {
            PREPARING: {
                emoji: '👨‍🍳',
                title: 'Order is Being Prepared',
                message: 'Your order is being carefully prepared by our team.',
                color: '#3b82f6',
            },
            SHIPPING: {
                emoji: '🚚',
                title: 'Order Shipped',
                message: 'Your order is on its way to you!',
                color: '#8b5cf6',
            },
            DELIVERED: {
                emoji: '📦',
                title: 'Order Delivered',
                message: 'Your order has been delivered. Enjoy your purchase!',
                color: '#10b981',
            },
        };

        const config = statusConfig[newStatus] || {
            emoji: '📋',
            title: `Order Status: ${newStatus}`,
            message: 'Your order status has been updated.',
            color: '#6b7280',
        };

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${config.color}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          .status-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.title}</h1>
          </div>
          <div class="content">
            <div class="status-icon">${config.emoji}</div>
            <p>Hi ${data.customerName},</p>
            <p>${config.message}</p>
            
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> #${data.orderNumber}</p>
            ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
            
            ${newStatus === 'DELIVERED' ? `
              <p>We hope you enjoy your purchase! If you have any feedback, we'd love to hear from you.</p>
            ` : ''}
          </div>
          <div class="footer">
            <p>Need help? Contact us at ${this.supportEmail}</p>
            <p>RachelFoods - Authentic Traditional Foods, Delivered Across the U.S.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private buildRefillReminderTemplate(data: RefillReminderData): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Time to Refill?</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>It's been a while since you ordered <strong>${data.productName}</strong>.</p>
            
            <p><strong>Last Ordered:</strong> ${this.formatDate(data.lastOrderedAt)}</p>
            <p><strong>Quantity:</strong> ${data.quantity}</p>
            
            <p>Running low? Reorder with just one click and get your favorite products delivered again.</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}" 
                 style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reorder Now
              </a>
            </p>
            
            <p style="font-size: 12px; color: #6b7280;">
              This is a reminder for your convenience. You can manage your refill preferences anytime in your account settings.
            </p>
          </div>
          <div class="footer">
            <p>Need help? Contact us at ${this.supportEmail}</p>
            <p>RachelFoods - Authentic Traditional Foods, Delivered Across the U.S.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    private buildAdminAlertTemplate(
        subject: string,
        message: string,
        metadata?: any,
    ): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #fef2f2; border: 2px solid #fecaca; }
          pre { background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Admin Alert</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
            
            ${metadata ? `
              <h3>Additional Details</h3>
              <pre>${JSON.stringify(metadata, null, 2)}</pre>
            ` : ''}
            
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
}
