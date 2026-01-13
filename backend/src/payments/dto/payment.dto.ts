import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentIntentDto {
    @IsString()
    orderId: string;
}

export class StripeWebhookDto {
    // Webhook payload validated by Stripe signature
    // No validation decorators needed - handled by raw body
}

export class PaymentResponseDto {
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
}
