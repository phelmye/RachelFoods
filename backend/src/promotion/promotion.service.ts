import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, CouponType } from './dto/coupon.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PromotionService {
    private readonly logger = new Logger(PromotionService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Create a new coupon
     * PHASE 5B: Admin-only coupon creation
     */
    async createCoupon(dto: CreateCouponDto, createdBy: string) {
        // Normalize code to uppercase
        const code = dto.code.toUpperCase();

        // Check if code already exists
        const existing = await this.prisma.coupons.findUnique({
            where: { code },
        });

        if (existing) {
            throw new BadRequestException(`Coupon code '${code}' already exists`);
        }

        // Validate percent coupons don't exceed 100%
        if (dto.type === CouponType.PERCENT && dto.value > 100) {
            throw new BadRequestException('Percent discount cannot exceed 100%');
        }

        return this.prisma.coupons.create({
            data: {
                id: crypto.randomUUID(),
                code,
                type: dto.type,
                value: new Decimal(dto.value),
                maxUses: dto.maxUses || null,
                usedCount: 0,
                minOrderAmount: dto.minOrderAmount ? new Decimal(dto.minOrderAmount) : null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                isActive: dto.isActive !== false,
                createdBy,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Validate coupon and calculate discount
     * PHASE 5B: Server-side validation - NEVER trust client
     */
    async validateCoupon(code: string, orderSubtotal: number): Promise<{
        isValid: boolean;
        discountAmount: number;
        coupon?: any;
        error?: string;
    }> {
        const normalizedCode = code.toUpperCase();

        // Find coupon
        const coupon = await this.prisma.coupons.findUnique({
            where: { code: normalizedCode },
        });

        if (!coupon) {
            return {
                isValid: false,
                discountAmount: 0,
                error: 'Coupon not found',
            };
        }

        // Check if active
        if (!coupon.isActive) {
            return {
                isValid: false,
                discountAmount: 0,
                error: 'Coupon is no longer active',
            };
        }

        // Check expiry
        if (coupon.expiresAt && new Date() > coupon.expiresAt) {
            return {
                isValid: false,
                discountAmount: 0,
                error: 'Coupon has expired',
            };
        }

        // Check usage limits
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return {
                isValid: false,
                discountAmount: 0,
                error: 'Coupon usage limit reached',
            };
        }

        // Check minimum order amount
        if (coupon.minOrderAmount !== null && orderSubtotal < Number(coupon.minOrderAmount)) {
            return {
                isValid: false,
                discountAmount: 0,
                error: `Minimum order amount of $${coupon.minOrderAmount} required`,
            };
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.type === 'PERCENT') {
            discountAmount = (orderSubtotal * Number(coupon.value)) / 100;
        } else {
            // FIXED
            discountAmount = Math.min(Number(coupon.value), orderSubtotal);
        }

        // PHASE 5B: NEVER exceed order subtotal
        discountAmount = Math.min(discountAmount, orderSubtotal);
        discountAmount = Math.max(0, discountAmount); // Never negative

        return {
            isValid: true,
            discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimals
            coupon,
        };
    }

    /**
     * Increment coupon usage count
     * PHASE 5B: Called after successful order creation
     */
    async incrementCouponUsage(code: string) {
        const normalizedCode = code.toUpperCase();

        await this.prisma.coupons.updateMany({
            where: { code: normalizedCode },
            data: {
                usedCount: { increment: 1 },
                updatedAt: new Date(),
            },
        });

        this.logger.log(`Coupon ${normalizedCode} usage incremented`);
    }

    /**
     * Update coupon
     */
    async updateCoupon(id: string, dto: UpdateCouponDto) {
        const coupon = await this.prisma.coupons.findUnique({
            where: { id },
        });

        if (!coupon) {
            throw new NotFoundException('Coupon not found');
        }

        return this.prisma.coupons.update({
            where: { id },
            data: {
                isActive: dto.isActive !== undefined ? dto.isActive : undefined,
                maxUses: dto.maxUses !== undefined ? dto.maxUses : undefined,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Get all coupons (admin only)
     */
    async getAllCoupons(includeInactive = false) {
        const where: any = {};
        if (!includeInactive) {
            where.isActive = true;
        }

        return this.prisma.coupons.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get coupon by ID
     */
    async getCouponById(id: string) {
        const coupon = await this.prisma.coupons.findUnique({
            where: { id },
        });

        if (!coupon) {
            throw new NotFoundException('Coupon not found');
        }

        return coupon;
    }

    /**
     * Delete coupon
     */
    async deleteCoupon(id: string) {
        const coupon = await this.prisma.coupons.findUnique({
            where: { id },
        });

        if (!coupon) {
            throw new NotFoundException('Coupon not found');
        }

        // Soft delete by deactivating
        return this.prisma.coupons.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Get coupon usage statistics
     */
    async getCouponStats(id: string) {
        const coupon = await this.prisma.coupons.findUnique({
            where: { id },
        });

        if (!coupon) {
            throw new NotFoundException('Coupon not found');
        }

        const usagePercentage = coupon.maxUses
            ? (coupon.usedCount / coupon.maxUses) * 100
            : 0;

        return {
            ...coupon,
            usagePercentage: Math.round(usagePercentage * 100) / 100,
            remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
            isExpired: coupon.expiresAt ? new Date() > coupon.expiresAt : false,
        };
    }
}
