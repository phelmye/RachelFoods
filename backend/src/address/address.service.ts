import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateAddressDto,
    UpdateAddressDto,
    AddressResponseDto,
} from './dto/address.dto';

@Injectable()
export class AddressService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new address for user
     */
    async createAddress(
        userId: string,
        dto: CreateAddressDto,
    ): Promise<AddressResponseDto> {
        // If this is set as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.addresses.updateMany({
                where: {
                    userId,
                    isDefault: true,
                },
                data: {
                    isDefault: false,
                },
            });
        }

        // If user has no addresses, make this the default
        const existingAddressCount = await this.prisma.addresses.count({
            where: { userId },
        });

        const isDefault = dto.isDefault ?? existingAddressCount === 0;

        const address = await this.prisma.addresses.create({
            data: {
                userId,
                label: dto.label,
                street: dto.street,
                city: dto.city,
                state: dto.state,
                zip: dto.zip,
                country: dto.country || 'US',
                isDefault,
            },
        });

        return this.mapToResponseDto(address);
    }

    /**
     * Get all addresses for user
     */
    async getUserAddresses(userId: string): Promise<AddressResponseDto[]> {
        const addresses = await this.prisma.addresses.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });

        return addresses.map((addr) => this.mapToResponseDto(addr));
    }

    /**
     * Get a single address
     */
    async getAddress(
        userId: string,
        addressId: string,
    ): Promise<AddressResponseDto> {
        const address = await this.prisma.addresses.findUnique({
            where: { id: addressId },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        if (address.userId !== userId) {
            throw new UnauthorizedException(
                'You do not have permission to access this address',
            );
        }

        return this.mapToResponseDto(address);
    }

    /**
     * Update an address
     */
    async updateAddress(
        userId: string,
        addressId: string,
        dto: UpdateAddressDto,
    ): Promise<AddressResponseDto> {
        const address = await this.prisma.addresses.findUnique({
            where: { id: addressId },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        if (address.userId !== userId) {
            throw new UnauthorizedException(
                'You do not have permission to update this address',
            );
        }

        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.addresses.updateMany({
                where: {
                    userId,
                    isDefault: true,
                    id: { not: addressId },
                },
                data: {
                    isDefault: false,
                },
            });
        }

        const updated = await this.prisma.addresses.update({
            where: { id: addressId },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
        });

        return this.mapToResponseDto(updated);
    }

    /**
     * Delete an address
     */
    async deleteAddress(userId: string, addressId: string): Promise<void> {
        const address = await this.prisma.addresses.findUnique({
            where: { id: addressId },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        if (address.userId !== userId) {
            throw new UnauthorizedException(
                'You do not have permission to delete this address',
            );
        }

        await this.prisma.addresses.delete({
            where: { id: addressId },
        });

        // If this was default, set another as default
        if (address.isDefault) {
            const firstAddress = await this.prisma.addresses.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' },
            });

            if (firstAddress) {
                await this.prisma.addresses.update({
                    where: { id: firstAddress.id },
                    data: { isDefault: true },
                });
            }
        }
    }

    /**
     * Set an address as default
     */
    async setDefaultAddress(
        userId: string,
        addressId: string,
    ): Promise<AddressResponseDto> {
        const address = await this.prisma.addresses.findUnique({
            where: { id: addressId },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        if (address.userId !== userId) {
            throw new UnauthorizedException(
                'You do not have permission to update this address',
            );
        }

        // Unset other defaults
        await this.prisma.addresses.updateMany({
            where: {
                userId,
                isDefault: true,
            },
            data: {
                isDefault: false,
            },
        });

        // Set this as default
        const updated = await this.prisma.addresses.update({
            where: { id: addressId },
            data: {
                isDefault: true,
                updatedAt: new Date(),
            },
        });

        return this.mapToResponseDto(updated);
    }

    private mapToResponseDto(address: any): AddressResponseDto {
        return {
            id: address.id,
            userId: address.userId,
            label: address.label,
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            isDefault: address.isDefault,
            createdAt: address.createdAt,
            updatedAt: address.updatedAt,
        };
    }
}
