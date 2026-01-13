export interface EmailTemplate {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface OrderEmailData {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        variant?: string;
    }>;
    totalAmount: number;
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    paymentMethod?: string;
    status?: string;
    trackingNumber?: string;
}

export interface RefillReminderData {
    customerName: string;
    customerEmail: string;
    productName: string;
    quantity: number;
    lastOrderedAt: Date;
    refillProfileId: string;
}

export abstract class EmailService {
    /**
     * Send order created email
     */
    abstract sendOrderCreatedEmail(data: OrderEmailData): Promise<void>;

    /**
     * Send payment successful email
     */
    abstract sendPaymentSuccessEmail(data: OrderEmailData): Promise<void>;

    /**
     * Send COD confirmation email
     */
    abstract sendCODConfirmationEmail(data: OrderEmailData): Promise<void>;

    /**
     * Send order status update email
     */
    abstract sendOrderStatusEmail(
        data: OrderEmailData,
        newStatus: string,
    ): Promise<void>;

    /**
     * Send refill reminder email
     */
    abstract sendRefillReminderEmail(data: RefillReminderData): Promise<void>;

    /**
     * Send admin alert email
     */
    abstract sendAdminAlertEmail(
        adminEmail: string,
        subject: string,
        message: string,
        metadata?: any,
    ): Promise<void>;

    /**
     * Helper to format currency
     */
    protected formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }

    /**
     * Helper to format date
     */
    protected formatDate(date: Date): string {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    }
}
