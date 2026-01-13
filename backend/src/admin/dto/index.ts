import {
    IsString,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsEnum,
    Min,
    MaxLength,
} from 'class-validator';

export class CreateProductDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    weight?: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsEnum(['ACTIVE', 'DISABLED'])
    @IsOptional()
    status?: string;

    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;

    @IsBoolean()
    @IsOptional()
    supportsRefill?: boolean;
}

export class UpdateProductDto {
    @IsString()
    @MaxLength(200)
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    weight?: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsEnum(['ACTIVE', 'DISABLED'])
    @IsOptional()
    status?: string;

    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;

    @IsBoolean()
    @IsOptional()
    supportsRefill?: boolean;
}

export class CreateVariantDto {
    @IsString()
    @MaxLength(200)
    name: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateVariantDto {
    @IsString()
    @MaxLength(200)
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    sku?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    stock?: number;

    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
export class UpdateOrderStatusDto {
    @IsEnum([
        'PENDING',
        'CONFIRMED',
        'PAID',
        'PREPARING',
        'SHIPPING',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
    ])
    status: string;

    @IsEnum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
    @IsOptional()
    paymentStatus?: string;

    @IsString()
    @IsOptional()
    reason?: string;

    @IsString()
    @IsOptional()
    updatedBy?: string;
}