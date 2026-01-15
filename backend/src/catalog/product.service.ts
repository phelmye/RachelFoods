import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductService {
    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
    ) { }

    /**
     * Transform product to include imageUrl from images array and variants
     * PHASE 5A: Add stock visibility and low-stock indicators
     */
    private transformProduct(product: any, includeStockInfo = false) {
        if (!product) return product;

        const transformed: any = {
            ...product,
            imageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
            variants: product.variants || [],
        };

        // PHASE 5A: Add stock information for admin queries
        if (includeStockInfo && product.variants) {
            transformed.variants = product.variants.map((v: any) => ({
                ...v,
                isLowStock: v.stock <= 5 && v.stock > 0,
                isOutOfStock: v.stock === 0,
            }));

            // Aggregate stock status
            const totalStock = product.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
            transformed.totalStock = totalStock;
            transformed.hasLowStock = product.variants.some((v: any) => v.stock <= 5 && v.stock > 0);
            transformed.hasOutOfStock = product.variants.some((v: any) => v.stock === 0);
        }

        return transformed;
    }

    /**
     * Transform multiple products
     */
    private transformProducts(products: any[], includeStockInfo = false) {
        return products.map(p => this.transformProduct(p, includeStockInfo));
    }

    /**
     * Create a new product
     */
    async create(createProductDto: CreateProductDto, userId: string) {
        // Check if slug already exists
        const existing = await this.prisma.products.findUnique({
            where: { slug: createProductDto.slug },
        });

        if (existing) {
            throw new ConflictException(`Product with slug '${createProductDto.slug}' already exists`);
        }

        // Validate category exists if provided
        if (createProductDto.categoryId) {
            const category = await this.prisma.categories.findUnique({
                where: { id: createProductDto.categoryId },
            });

            if (!category || category.deletedAt) {
                throw new NotFoundException(`Category with id '${createProductDto.categoryId}' not found`);
            }
        }

        return this.prisma.products.create({
            data: {
                id: crypto.randomUUID(),
                name: createProductDto.name,
                slug: createProductDto.slug,
                description: createProductDto.description,
                price: new Decimal(createProductDto.price),
                unit: createProductDto.unit,
                weight: new Decimal(createProductDto.weight),
                stock: createProductDto.stock ?? 0,
                perishable: createProductDto.perishable ?? false,
                categoryId: createProductDto.categoryId,
                imageUrl: createProductDto.images?.[0] ?? null,
                createdBy: userId,
                updatedAt: new Date(),
            },
            include: {
                category: true,
            },
        });
    }

    /**
     * Find all products (only active ones by default for buyers)
     * PHASE 5A: Include stock information for admin users
     */
    async findAll(includeDisabled = false, includeArchived = false) {
        const statusFilter: ('DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED')[] = [];
        const isAdminQuery = includeDisabled || includeArchived;

        if (isAdminQuery) {
            // Admin/Store Owner view
            if (!includeArchived) {
                statusFilter.push('DRAFT', 'ACTIVE', 'DISABLED');
            } else {
                statusFilter.push('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED');
            }
        } else {
            // Buyer view
            statusFilter.push('ACTIVE');
        }

        const products = await this.prisma.products.findMany({
            where: {
                deletedAt: null,
                status: { in: statusFilter },
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                variants: {
                    where: {
                        isActive: true,
                        deletedAt: null,
                    },
                    orderBy: [
                        { isDefault: 'desc' },
                        { createdAt: 'asc' },
                    ],
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        price: true,
                        stock: true,
                        isDefault: true,
                        isActive: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
            orderBy: [{ createdAt: 'desc' }],
        });

        return this.transformProducts(products, isAdminQuery);
    }

    /**
     * Find products by category
     */
    async findByCategory(categoryId: string, includeDisabled = false) {
        const statusFilter: ('DRAFT' | 'ACTIVE' | 'DISABLED')[] = includeDisabled
            ? ['DRAFT', 'ACTIVE', 'DISABLED']
            : ['ACTIVE'];

        const products = await this.prisma.products.findMany({
            where: {
                categoryId,
                deletedAt: null,
                status: { in: statusFilter },
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: [{ name: 'asc' }],
        });

        return this.transformProducts(products);
    }

    /**
     * Find product by ID
     */
    async findOne(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            include: {
                category: true,
                variants: {
                    where: {
                        isActive: true,
                        deletedAt: null,
                    },
                    orderBy: [
                        { isDefault: 'desc' },
                        { createdAt: 'asc' },
                    ],
                },
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.transformProduct(product);
    }

    /**
     * Find product by slug
     */
    async findBySlug(slug: string) {
        const product = await this.prisma.products.findUnique({
            where: { slug },
            include: {
                category: true,
                variants: {
                    where: {
                        isActive: true,
                        deletedAt: null,
                    },
                    orderBy: [
                        { isDefault: 'desc' },
                        { createdAt: 'asc' },
                    ],
                },
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with slug '${slug}' not found`);
        }

        return this.transformProduct(product);
    }

    /**
     * Update a product
     */
    async update(id: string, updateProductDto: UpdateProductDto) {
        // Check if product exists
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        // Check if slug is unique (if being updated)
        if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
            const existing = await this.prisma.products.findUnique({
                where: { slug: updateProductDto.slug },
            });

            if (existing) {
                throw new ConflictException(`Product with slug '${updateProductDto.slug}' already exists`);
            }
        }

        // Validate category exists if provided
        if (updateProductDto.categoryId) {
            const category = await this.prisma.categories.findUnique({
                where: { id: updateProductDto.categoryId },
            });

            if (!category || category.deletedAt) {
                throw new NotFoundException(`Category with id '${updateProductDto.categoryId}' not found`);
            }
        }

        // Convert numbers to Decimal if provided
        const data: any = { ...updateProductDto };
        if (updateProductDto.price !== undefined) {
            data.price = new Decimal(updateProductDto.price);
        }
        if (updateProductDto.weight !== undefined) {
            data.weight = new Decimal(updateProductDto.weight);
        }

        const updated = await this.prisma.products.update({
            where: { id },
            data,
            include: {
                category: true,
            },
        });

        // PHASE 6A: Invalidate caches after update
        this.invalidateProductCaches();

        return updated;
    }

    /**
     * Disable a product (hide from buyers, mark as out of stock)
     * PHASE 6A: Added cache invalidation
     */
    async disable(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const updated = await this.prisma.products.update({
            where: { id },
            data: { status: 'DISABLED' },
        });

        this.invalidateProductCaches();
        return updated;
    }

    /**
     * Enable a product (make visible to buyers)
     */
    async enable(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const updated = await this.prisma.products.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        this.invalidateProductCaches();
        return updated;
    }

    /**
     * Publish a product (transition from DRAFT to ACTIVE with validation)
     * 
     * Lifecycle State Enforcement:
    /**
     * Archive a product (historical reference only)
     */
    async archive(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.prisma.products.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });
    }

    /**
     * Soft delete a product
     */
    async remove(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        // Soft delete the product
        return this.prisma.products.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'ARCHIVED',
            },
        });
    }

    /**
     * Update product stock
     */
    async updateStock(id: string, quantity: number) {
        if (quantity < 0) {
            throw new BadRequestException('Stock quantity cannot be negative');
        }

        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        return this.prisma.products.update({
            where: { id },
            data: { stock: quantity },
        });
    }

    /**
     * Add images to a product
     */
    async addImages(id: string, imageUrls: string[]) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const newImageUrl = imageUrls[0]; // Use first image only

        return this.prisma.products.update({
            where: { id },
            data: { imageUrl: newImageUrl },
        });
    }

    /**
     * Remove an image from a product
     */
    async removeImage(id: string, imageUrl: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        // If removing the current image, set to null
        const newImageUrl = product.imageUrl === imageUrl ? null : product.imageUrl;

        return this.prisma.products.update({
            where: { id },
            data: { imageUrl: newImageUrl },
        });
    }

    /**
     * Search products by name or description
     */
    async search(query: string, includeDisabled = false) {
        const statusFilter: ('DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED')[] = includeDisabled
            ? ['DRAFT', 'ACTIVE', 'DISABLED']
            : ['ACTIVE'];

        const products = await this.prisma.products.findMany({
            where: {
                deletedAt: null,
                status: { in: statusFilter },
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    {
                        category: {
                            name: { contains: query, mode: 'insensitive' }
                        }
                    },
                    {
                        variants: {
                            some: {
                                name: { contains: query, mode: 'insensitive' },
                                isActive: true,
                                deletedAt: null,
                            }
                        }
                    }
                ],
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                variants: {
                    where: {
                        isActive: true,
                        deletedAt: null,
                    },
                    orderBy: [
                        { isDefault: 'desc' },
                        { createdAt: 'asc' },
                    ],
                },
            },
            orderBy: [{ name: 'asc' }],
        });

        return this.transformProducts(products);
    }

    /**
     * Find featured products
     * PHASE 6A: Added caching with 5-minute TTL
     */
    async findFeatured() {
        return this.cache.getOrSet(
            'products:featured',
            async () => {
                const products = await this.prisma.products.findMany({
                    where: {
                        deletedAt: null,
                        status: 'ACTIVE',
                        isFeatured: true,
                    },
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                        variants: {
                            where: {
                                isActive: true,
                                deletedAt: null,
                            },
                            orderBy: [
                                { isDefault: 'desc' },
                                { createdAt: 'asc' },
                            ],
                        },
                    },
                    orderBy: [{ name: 'asc' }],
                    take: 8,
                });

                return this.transformProducts(products);
            },
            5 * 60 * 1000, // 5 minutes
        );
    }

    /**
     * Find popular products (by order count)
     * PHASE 6A: Added caching with 5-minute TTL
     */
    async findPopular(limit = 6) {
        return this.cache.getOrSet(
            `products:popular:${limit}`,
            async () => {
                const products = await this.prisma.products.findMany({
                    where: {
                        deletedAt: null,
                        status: 'ACTIVE',
                    },
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                        variants: {
                            where: {
                                isActive: true,
                                deletedAt: null,
                            },
                            orderBy: [
                                { isDefault: 'desc' },
                                { createdAt: 'asc' },
                            ],
                        },
                    },
                    orderBy: [{ orderCount: 'desc' }, { name: 'asc' }],
                    take: limit,
                });

                return this.transformProducts(products);
            },
            5 * 60 * 1000, // 5 minutes
        );
    }

    /**
     * Invalidate product caches
     * PHASE 6A: Call this when products are created/updated/deleted
     */
    invalidateProductCaches() {
        this.cache.deletePattern('^products:');
    }

    /**
     * Get impact preview for product actions
     * Shows how many orders and merchandising visibility would be affected
     */
    async getImpactPreview(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                isFeatured: true,
                orderCount: true,
            },
        });

        if (!product || product.status === 'ARCHIVED') {
            throw new NotFoundException(`Product with id '${id}' not found or archived`);
        }

        // Count active orders containing this product
        const activeOrders = await this.prisma.order_items.count({
            where: {
                productId: id,
                orders: {
                    status: {
                        in: ['PENDING', 'CONFIRMED', 'PAID', 'PREPARING', 'SHIPPING'],
                    },
                },
            },
        });

        // Check if product is in featured or popular lists
        const isFeatured = product.isFeatured;
        const isPopular = product.orderCount > 0;

        return {
            productId: id,
            productName: product.name,
            currentStatus: product.status,
            activeOrdersAffected: activeOrders,
            isFeatured,
            isPopular,
            warnings: [
                activeOrders > 0 && 'This product has active orders in progress',
                isFeatured && 'This product is featured on the homepage',
                isPopular && 'This product appears in popular products list',
            ].filter(Boolean),
        };
    }

    /**
     * Disable a product (temporarily hide from catalog)
     * Requires confirmation if product is ACTIVE and has warnings
     */
    async disableProduct(id: string, confirmed = false) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                deletedAt: true,
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        if (product.status === 'ARCHIVED') {
            throw new BadRequestException('Cannot disable an archived product');
        }

        if (product.status === 'DISABLED') {
            return {
                message: 'Product is already disabled',
                product,
            };
        }

        // Get impact preview for warnings
        const impact = await this.getImpactPreview(id);

        // Require confirmation if product is ACTIVE and has impact
        if (product.status === 'ACTIVE' && !confirmed && impact.warnings.length > 0) {
            throw new BadRequestException({
                message: 'Confirmation required to disable this ACTIVE product',
                requiresConfirmation: true,
                impact,
                hint: 'Add ?confirmed=true to proceed',
            });
        }

        // Disable the product
        const disabled = await this.prisma.products.update({
            where: { id },
            data: {
                status: 'DISABLED',
                updatedAt: new Date(),
            },
            include: {
                category: true,
            },
        });

        // Invalidate caches
        this.invalidateProductCaches();

        return {
            message: 'Product successfully disabled',
            product: this.transformProduct(disabled),
            impact,
        };
    }

    /**
     * Archive a product (historical reference, not sellable)
     * Blocked if product has active orders
     */
    async archiveProduct(id: string, confirmed = false) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                deletedAt: true,
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        if (product.status === 'ARCHIVED') {
            return {
                message: 'Product is already archived',
                product,
            };
        }

        // Get impact preview
        const impact = await this.getImpactPreview(id);

        // BLOCK archiving if there are active orders
        if (impact.activeOrdersAffected > 0) {
            throw new BadRequestException({
                message: 'Cannot archive product with active orders',
                blocked: true,
                impact,
                hint: 'Wait for active orders to complete or cancel them first',
            });
        }

        // Require confirmation for ACTIVE products
        if (product.status === 'ACTIVE' && !confirmed) {
            throw new BadRequestException({
                message: 'Confirmation required to archive this ACTIVE product',
                requiresConfirmation: true,
                impact,
                hint: 'Add ?confirmed=true to proceed',
            });
        }

        // Archive the product
        const archived = await this.prisma.products.update({
            where: { id },
            data: {
                status: 'ARCHIVED',
                updatedAt: new Date(),
            },
            include: {
                category: true,
            },
        });

        // Invalidate caches
        this.invalidateProductCaches();

        return {
            message: 'Product successfully archived',
            product: this.transformProduct(archived),
            impact,
        };
    }

    /**
     * Publish a product with enhanced validation and soft warnings
     * Hard validation: image, price > 0, category
     * Soft warnings: low stock, no featured image
     */
    async publishProduct(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            include: {
                category: true,
                variants: {
                    where: {
                        deletedAt: null,
                    },
                },
            },
        });

        if (!product || product.deletedAt) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        if (product.status === 'ARCHIVED') {
            throw new BadRequestException('Cannot publish an archived product');
        }

        if (product.status === 'ACTIVE') {
            return {
                message: 'Product is already published',
                product: this.transformProduct(product),
                warnings: [],
            };
        }

        // Hard validation (blocking)
        const validationIssues: string[] = [];

        if (!product.imageUrl) {
            validationIssues.push('Product must have at least one image');
        }

        if (product.price.toNumber() <= 0) {
            validationIssues.push('Product price must be greater than 0');
        }

        if (!product.categoryId) {
            validationIssues.push('Product should have a category assigned');
        }

        if (validationIssues.length > 0) {
            throw new BadRequestException({
                message: 'Product does not meet publishing requirements',
                issues: validationIssues,
                hint: 'Fix these issues before publishing',
            });
        }

        // Soft warnings (non-blocking)
        const warnings: string[] = [];

        // Check for low stock
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        if (totalStock === 0) {
            warnings.push('Product has zero stock - buyers will see "Out of Stock"');
        } else if (totalStock <= 5) {
            warnings.push(`Product has low stock (${totalStock} units)`);
        }

        // Check if product has featured image (placeholder vs real image)
        if (product.imageUrl && product.imageUrl.includes('placeholder')) {
            warnings.push('Product is using a placeholder image - consider uploading a real product photo');
        }

        // Publish the product
        const published = await this.prisma.products.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                updatedAt: new Date(),
            },
            include: {
                category: true,
                variants: {
                    where: {
                        isActive: true,
                        deletedAt: null,
                    },
                },
            },
        });

        // Invalidate caches
        this.invalidateProductCaches();

        return {
            message: 'Product successfully published',
            product: this.transformProduct(published),
            warnings,
            publishedAt: new Date().toISOString(),
        };
    }

    /**
     * Get product visibility diagnostics (admin troubleshooting)
     */
    async getProductVisibilityDiagnostics(id: string) {
        const product = await this.prisma.products.findUnique({
            where: { id },
            include: {
                category: true,
                variants: {
                    where: {
                        deletedAt: null,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const isVisibleToBuyers = product.status === 'ACTIVE' && !product.deletedAt;

        const reasons: string[] = [];
        if (product.status !== 'ACTIVE') {
            reasons.push(`Product status is '${product.status}' (must be 'ACTIVE' for public visibility)`);
        }
        if (product.deletedAt) {
            reasons.push('Product is soft-deleted');
        }
        if (!product.imageUrl) {
            reasons.push('Product has no image');
        }
        if (product.price.toNumber() <= 0) {
            reasons.push('Product price is not set or is zero');
        }

        const activeVariants = product.variants.filter(v => v.isActive && !v.deletedAt);

        return {
            productId: id,
            productName: product.name,
            isVisibleToBuyers,
            message: isVisibleToBuyers
                ? 'Product is visible to buyers'
                : 'Product is NOT visible to buyers. See reasons below.',
            reasons,
            status: product.status,
            hasImage: !!product.imageUrl,
            price: product.price,
            stock: product.stock,
            categoryId: product.categoryId,
            categoryName: product.category?.name,
            variantCount: product.variants.length,
            activeVariantCount: activeVariants.length,
        };
    }
}
