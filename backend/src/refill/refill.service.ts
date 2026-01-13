import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateRefillProfileDto,
    UpdateRefillProfileDto,
    CreateRefillOrderDto,
    RefillProfileResponseDto,
} from './dto/refill.dto';

@Injectable()
export class RefillService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create or update a refill profile for a product/variant
     * This is called after a successful order
     */
    async createOrUpdateRefillProfile(
        userId: string,
        dto: CreateRefillProfileDto,
    ): Promise<RefillProfileResponseDto> {
        // Verify product exists and supports refill
        const product = await this.prisma.products.findUnique({
            where: { id: dto.productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (!product.supportsRefill) {
            throw new BadRequestException('This product does not support refill');
        }

        // Verify variant if provided
        if (dto.variantId) {
            const variant = await this.prisma.product_variants.findFirst({
                where: {
                    id: dto.variantId,
                    productId: dto.productId,
                    isActive: true,
                },
            });

            if (!variant) {
                throw new NotFoundException('Product variant not found');
            }
        }

        // Create or update refill profile
        const refillProfile = await this.prisma.refill_profiles.upsert({
            where: {
                userId_productId_variantId: {
                    userId,
                    productId: dto.productId,
                    variantId: dto.variantId || null,
                },
            },
            update: {
                quantity: dto.quantity,
                isActive: true,
                lastOrderedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                userId,
                productId: dto.productId,
                variantId: dto.variantId || null,
                quantity: dto.quantity,
                lastOrderedAt: new Date(),
                isActive: true,
            },
            include: {
                products: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        imageUrl: true,
                        supportsRefill: true,
                    },
                },
                variants: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                    },
                },
            },
        });

        return this.mapToResponseDto(refillProfile);
    }

    /**
     * Get all active refill profiles for a user
     */
    async getUserRefillProfiles(
        userId: string,
    ): Promise<RefillProfileResponseDto[]> {
        const profiles = await this.prisma.refill_profiles.findMany({
            where: {
                userId,
                isActive: true,
            },
            include: {
                products: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        imageUrl: true,
                        supportsRefill: true,
                        status: true,
                    },
                },
                variants: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        isActive: true,
                    },
                },
            },
            orderBy: {
                lastOrderedAt: 'desc',
            },
        });

        // Filter out profiles where product is not active or variant is not active
        const activeProfiles = profiles.filter((profile) => {
            if (profile.products.status !== 'ACTIVE') return false;
            if (profile.variantId && profile.variants && !profile.variants.isActive)
                return false;
            return true;
        });

        return activeProfiles.map((profile) => this.mapToResponseDto(profile));
    }

    /**
     * Create a new order from a refill profile
     * Uses current prices, not stored prices
     */
    async createOrderFromRefill(
        userId: string,
        dto: CreateRefillOrderDto,
    ): Promise<any> {
        // PHASE 5A: Use transaction for atomic stock safety
        return await this.prisma.$transaction(async (tx) => {
            // Get refill profile
            const profile = await tx.refill_profiles.findUnique({
                where: { id: dto.refillProfileId },
                include: {
                    products: true,
                    variants: true,
                },
            });

            if (!profile) {
                throw new NotFoundException('Refill profile not found');
            }

            if (profile.userId !== userId) {
                throw new UnauthorizedException(
                    'You do not have permission to use this refill profile',
                );
            }

            if (!profile.isActive) {
                throw new BadRequestException('Refill profile is not active');
            }

            // Check product status
            if (profile.products.status !== 'ACTIVE') {
                throw new BadRequestException('Product is no longer available');
            }

            // Check variant if applicable
            if (profile.variantId && profile.variants) {
                if (!profile.variants.isActive) {
                    throw new BadRequestException('Product variant is no longer available');
                }
            }

            // Get user's default address or throw error
            const defaultAddress = await tx.addresses.findFirst({
                where: {
                    userId,
                    isDefault: true,
                },
            });

            if (!defaultAddress) {
                throw new BadRequestException(
                    'Please set a default delivery address before creating a refill order',
                );
            }

            // Calculate current price (NEVER reuse old prices)
            const itemPrice = profile.variantId
                ? profile.variants.price
                : profile.products.price;
            const quantity = profile.quantity;
            const subtotal = Number(itemPrice) * quantity;
            const weight = Number(profile.products.weight) * quantity;

            // For simplicity, use fixed shipping cost (can be enhanced with shipping engine)
            const shippingCost = 5.0;
            const totalCost = subtotal + shippingCost;

            // Generate order number
            const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Create order
            const order = await tx.orders.create({
                data: {
                    id: crypto.randomUUID(),
                    orderNumber,
                    buyerId: userId,
                    deliveryAddress: defaultAddress.street,
                    deliveryCity: defaultAddress.city,
                    deliveryState: defaultAddress.state,
                    deliveryZipCode: defaultAddress.zip,
                    deliveryPhone: '', // Should come from user profile
                    deliveryNotes: dto.deliveryNotes || null,
                    subtotal,
                    shippingCost,
                    totalCost,
                    totalWeight: weight,
                    paymentMethod: dto.paymentMethod,
                    status: 'PENDING',
                    paymentStatus: 'PENDING',
                    updatedAt: new Date(),
                    order_items: {
                        create: [
                            {
                                id: crypto.randomUUID(),
                                productId: profile.productId,
                                variantId: profile.variantId || null,
                                categoryId: profile.products.categoryId || null,
                                productName: profile.products.name,
                                variantName: profile.variants?.name || null,
                                quantity: profile.quantity,
                                productPrice: itemPrice,
                                productWeight: profile.products.weight,
                                productUnit: profile.products.unit,
                                subtotal: subtotal,
                            },
                        ],
                    },
                },
                include: {
                    order_items: true,
                },
            });

            // PHASE 5A: Atomically deduct variant stock if applicable
            if (profile.variantId) {
                const updateResult = await tx.product_variants.updateMany({
                    where: {
                        id: profile.variantId,
                        stock: { gte: profile.quantity },
                    },
                    data: {
                        stock: { decrement: profile.quantity },
                        updatedAt: new Date(),
                    },
                });

                if (updateResult.count === 0) {
                    throw new BadRequestException(
                        `Stock depleted for ${profile.products.name} (${profile.variants?.name}). Please try again.`,
                    );
                }
            }

            // Update refill profile's lastOrderedAt
            await tx.refill_profiles.update({
                where: { id: dto.refillProfileId },
                data: {
                    lastOrderedAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            return order;
        });
    }

    /**
     * Update a refill profile (quantity or active status)
     */
    async updateRefillProfile(
        userId: string,
        profileId: string,
        dto: UpdateRefillProfileDto,
    ): Promise<RefillProfileResponseDto> {
        const profile = await this.prisma.refill_profiles.findUnique({
            where: { id: profileId },
        });

        if (!profile) {
            throw new NotFoundException('Refill profile not found');
        }

        if (profile.userId !== userId) {
            throw new UnauthorizedException(
                'You do not have permission to update this refill profile',
            );
        }

        const updated = await this.prisma.refill_profiles.update({
            where: { id: profileId },
            data: {
                ...dto,
                updatedAt: new Date(),
            },
            include: {
                products: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        imageUrl: true,
                        supportsRefill: true,
                    },
                },
                variants: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                    },
                },
            },
        });

        return this.mapToResponseDto(updated);
    }

    /**
     * Delete (deactivate) a refill profile
     */
    async deleteRefillProfile(userId: string, profileId: string): Promise<void> {
        const profile = await this.prisma.refill_profiles.findUnique({
            where: { id: profileId },
        });

        if (!profile) {
            throw new NotFoundException('Refill profile not found');
        }

        if (profile.userId !== userId) {
            throw new UnauthorizedException(
                'You do not have permission to delete this refill profile',
            );
        }

        await this.prisma.refill_profiles.update({
            where: { id: profileId },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Admin: Get refill analytics
     */
    async getRefillAnalytics() {
        const totalProfiles = await this.prisma.refill_profiles.count({
            where: { isActive: true },
        });

        const productRefillCounts = await this.prisma.refill_profiles.groupBy({
            by: ['productId'],
            where: { isActive: true },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 10,
        });

        // Get product details for top refilled products
        const topProducts = await Promise.all(
            productRefillCounts.map(async (item) => {
                const product = await this.prisma.products.findUnique({
                    where: { id: item.productId },
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        supportsRefill: true,
                    },
                });
                return {
                    product,
                    refillCount: item._count.id,
                };
            }),
        );

        return {
            totalActiveProfiles: totalProfiles,
            topRefillProducts: topProducts,
        };
    }

    private mapToResponseDto(profile: any): RefillProfileResponseDto {
        return {
            id: profile.id,
            userId: profile.userId,
            productId: profile.productId,
            variantId: profile.variantId,
            quantity: profile.quantity,
            lastOrderedAt: profile.lastOrderedAt,
            isActive: profile.isActive,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
            product: profile.products
                ? {
                    id: profile.products.id,
                    name: profile.products.name,
                    price: Number(profile.products.price),
                    imageUrl: profile.products.imageUrl,
                    supportsRefill: profile.products.supportsRefill,
                }
                : undefined,
            variant: profile.variants
                ? {
                    id: profile.variants.id,
                    name: profile.variants.name,
                    price: Number(profile.variants.price),
                }
                : null,
        };
    }
}
