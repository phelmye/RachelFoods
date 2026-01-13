import { IsString, IsInt, IsOptional, Min, IsBoolean } from 'class-validator';

export class CreateRefillProfileDto {
    @IsString()
    productId: string;

    @IsOptional()
    @IsString()
    variantId?: string;

    @IsInt()
    @Min(1)
    quantity: number;
}

export class UpdateRefillProfileDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class CreateRefillOrderDto {
    @IsString()
    refillProfileId: string;

    @IsString()
    paymentMethod: 'COD' | 'PREPAID';

    @IsOptional()
    @IsString()
    deliveryNotes?: string;
}

export class RefillProfileResponseDto {
    id: string;
    userId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    lastOrderedAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    product?: {
        id: string;
        name: string;
        price: number;
        imageUrl: string | null;
        supportsRefill: boolean;
    };
    variant?: {
        id: string;
        name: string;
        price: number;
    } | null;
}
