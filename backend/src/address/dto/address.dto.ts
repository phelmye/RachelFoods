import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
    @IsString()
    label: string; // Home, Work, etc.

    @IsString()
    street: string;

    @IsString()
    city: string;

    @IsString()
    state: string;

    @IsString()
    zip: string;

    @IsOptional()
    @IsString()
    country?: string; // Default: US

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}

export class UpdateAddressDto {
    @IsOptional()
    @IsString()
    label?: string;

    @IsOptional()
    @IsString()
    street?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    zip?: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}

export class AddressResponseDto {
    id: string;
    userId: string;
    label: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
