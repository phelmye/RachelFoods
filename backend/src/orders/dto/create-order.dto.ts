import { IsString, IsArray, IsOptional, IsBoolean, IsEnum, IsDateString, IsNumber, Min, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';
import { CustomOrderItemDto } from './custom-order-item.dto';

export enum PaymentMethod {
    COD = 'COD',
    PREPAID = 'PREPAID',
    CHECKOUT = 'CHECKOUT',
}

export enum RefillType {
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    EVENT = 'EVENT',
}

export class CreateOrderDto {
    // Order items (products from catalog)
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    // Custom items (for kitchen refill)
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomOrderItemDto)
    customItems?: CustomOrderItemDto[];

    // Delivery information
    @IsString()
    @MinLength(10)
    @MaxLength(500)
    deliveryAddress: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    deliveryCity: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    deliveryState?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    deliveryZipCode?: string;

    @IsString()
    @MinLength(10)
    @MaxLength(20)
    deliveryPhone: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    deliveryNotes?: string;

    // Payment method
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    // PHASE 5B: Coupon code (optional)
    @IsOptional()
    @IsString()
    @MaxLength(50)
    couponCode?: string;

    // PHASE 5C: Wallet usage
    @IsOptional()
    @IsNumber()
    @Min(0)
    useWalletAmount?: number;

    // Kitchen Refill specifics
    @IsOptional()
    @IsBoolean()
    isKitchenRefill?: boolean;

    @IsOptional()
    @IsEnum(RefillType)
    refillType?: RefillType;

    @IsOptional()
    @IsDateString()
    refillStartDate?: string;

    @IsOptional()
    @IsDateString()
    refillEndDate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    eventDescription?: string;
}
