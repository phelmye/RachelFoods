import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export enum CouponType {
    PERCENT = 'PERCENT',
    FIXED = 'FIXED',
}

export class CreateCouponDto {
    @IsString()
    code: string;

    @IsEnum(CouponType)
    type: CouponType;

    @IsNumber()
    @Min(0)
    value: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxUses?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minOrderAmount?: number;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateCouponDto {
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsNumber()
    @Min(1)
    maxUses?: number;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

export class ValidateCouponDto {
    @IsString()
    code: string;

    @IsNumber()
    @Min(0)
    orderSubtotal: number;
}
