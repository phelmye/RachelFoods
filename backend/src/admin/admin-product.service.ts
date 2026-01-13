import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateProductDto,
    UpdateProductDto,
    CreateVariantDto,
    UpdateVariantDto,
} from './dto';


@Injectable()
export class AdminProductService {
    constructor(private prisma: PrismaService) { }

    async findAll(options: {
        page: number;
        limit: number;
        search?: string;
        categoryId?: string;
        includeDisabled?: boolean;
    }) {
        const { page, limit, search, categoryId, includeDisabled } = options;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (!includeDisabled) {
            where.status = 'ACTIVE';
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        const [products, total] = await Promise.all([
            this.prisma.products.findMany({
                where,
                skip,
                take: limit,
                include: {
                    category: true,
                    variants: {
                        orderBy: { isDefault: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.products.count({ where }),
        ]);

        return {
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            include: {
                category: true,
                variants: {
                    orderBy: { isDefault: 'desc' },
                },
            },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }

        return product;
    }

    async create(dto: CreateProductDto) {
        // Validate category exists
        if (dto.categoryId) {
            const category = await this.prisma.categories.findUnique({
                where: { id: dto.categoryId },
            });
            if (!category) {
                throw new BadRequestException('Category not found');
            }
        }

        // Generate slug from name
        const slug = this.generateSlug(dto.name);

        // Check if slug already exists
        const existing = await this.prisma.products.findUnique({
            where: { slug },
        });
        if (existing) {
            throw new ConflictException(
                `Product with slug "${slug}" already exists`,
            );
        }

        const productId = `prd_${crypto.randomUUID()}`;

        // Create product with default variant
        const product = await this.prisma.products.create({
            data: {
                id: productId,
                name: dto.name,
                slug,
                description: dto.description,
                categoryId: dto.categoryId,
                price: dto.price,
                stock: dto.stock || 0,
                unit: dto.unit || 'unit',
                weight: dto.weight || 0,
                imageUrl: dto.imageUrl,
                status: (dto.status as any) || 'ACTIVE',
                isFeatured: dto.isFeatured || false,
                supportsRefill: dto.supportsRefill !== false,
                orderCount: 0,
                updatedAt: new Date(),
                variants: {
                    create: {
                        id: `var_${crypto.randomUUID()}`,
                        name: 'Default',
                        sku: `SKU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                        price: dto.price,
                        stock: dto.stock || 0,
                        isDefault: true,
                        isActive: true,
                        updatedAt: new Date(),
                    },
                },
            },
            include: {
                category: true,
                variants: true,
            },
        });

        return product;
    }

    async update(id: string, dto: UpdateProductDto) {
        const product = await this.findOne(id);

        // If name is being updated, regenerate slug
        let slug = product.slug;
        if (dto.name && dto.name !== product.name) {
            slug = this.generateSlug(dto.name);
            const existing = await this.prisma.products.findFirst({
                where: { slug, id: { not: id } },
            });
            if (existing) {
                throw new ConflictException(
                    `Product with slug "${slug}" already exists`,
                );
            }
        }

        // Validate category if provided
        if (dto.categoryId) {
            const category = await this.prisma.categories.findUnique({
                where: { id: dto.categoryId },
            });
            if (!category) {
                throw new BadRequestException('Category not found');
            }
        }

        const updated = await this.prisma.products.update({
            where: { id },
            data: {
                name: dto.name,
                slug,
                description: dto.description,
                categoryId: dto.categoryId,
                price: dto.price,
                stock: dto.stock,
                unit: dto.unit,
                weight: dto.weight,
                imageUrl: dto.imageUrl,
                status: dto.status as any,
                isFeatured: dto.isFeatured,
                supportsRefill: dto.supportsRefill,
                updatedAt: new Date(),
            },
            include: {
                category: true,
                variants: true,
            },
        });

        return updated;
    }

    async delete(id: string) {
        await this.findOne(id);

        // Soft delete by setting status to DISABLED
        await this.prisma.products.update({
            where: { id },
            data: {
                status: 'DISABLED',
                deletedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return { message: 'Product deleted successfully' };
    }

    // Variant Management
    async findVariants(productId: string) {
        await this.findOne(productId);

        return this.prisma.product_variants.findMany({
            where: { productId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
    }

    async createVariant(productId: string, dto: CreateVariantDto) {
        await this.findOne(productId);

        // Check if SKU already exists
        if (dto.sku) {
            const existing = await this.prisma.product_variants.findFirst({
                where: { sku: dto.sku },
            });
            if (existing) {
                throw new ConflictException(`Variant with SKU "${dto.sku}" already exists`);
            }
        }

        // If this is set as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.product_variants.updateMany({
                where: { productId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const variant = await this.prisma.product_variants.create({
            data: {
                id: `var_${crypto.randomUUID()}`,
                productId,
                name: dto.name,
                sku: dto.sku || `VAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                price: dto.price,
                stock: dto.stock || 0,
                isDefault: dto.isDefault || false,
                isActive: dto.isActive !== false,
                updatedAt: new Date(),
            },
        });

        return variant;
    }

    async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
        await this.findOne(productId);

        const variant = await this.prisma.product_variants.findFirst({
            where: { id: variantId, productId },
        });

        if (!variant) {
            throw new NotFoundException(`Variant with ID ${variantId} not found`);
        }

        // Check if SKU is being changed and if it already exists
        if (dto.sku && dto.sku !== variant.sku) {
            const existing = await this.prisma.product_variants.findFirst({
                where: { sku: dto.sku, id: { not: variantId } },
            });
            if (existing) {
                throw new ConflictException(`Variant with SKU "${dto.sku}" already exists`);
            }
        }

        // If this is set as default, unset other defaults
        if (dto.isDefault && !variant.isDefault) {
            await this.prisma.product_variants.updateMany({
                where: { productId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const updated = await this.prisma.product_variants.update({
            where: { id: variantId },
            data: {
                name: dto.name,
                sku: dto.sku,
                price: dto.price,
                stock: dto.stock,
                isDefault: dto.isDefault,
                isActive: dto.isActive,
                updatedAt: new Date(),
            },
        });

        return updated;
    }

    async deleteVariant(productId: string, variantId: string) {
        await this.findOne(productId);

        const variant = await this.prisma.product_variants.findFirst({
            where: { id: variantId, productId },
        });

        if (!variant) {
            throw new NotFoundException(`Variant with ID ${variantId} not found`);
        }

        if (variant.isDefault) {
            throw new BadRequestException('Cannot delete the default variant');
        }

        await this.prisma.product_variants.delete({
            where: { id: variantId },
        });

        return { message: 'Variant deleted successfully' };
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}
