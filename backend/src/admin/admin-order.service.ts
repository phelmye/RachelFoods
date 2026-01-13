import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrderStatusDto } from './dto';

@Injectable()
export class AdminOrderService {
    constructor(private prisma: PrismaService) { }

    async findAll(options: {
        page: number;
        limit: number;
        status?: string;
        paymentStatus?: string;
        search?: string;
    }) {
        const { page, limit, status, paymentStatus, search } = options;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }

        if (search) {
            where.OR = [
                { orderNumber: { contains: search, mode: 'insensitive' } },
                { deliveryPhone: { contains: search } },
                { users: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [orders, total] = await Promise.all([
            this.prisma.orders.findMany({
                where,
                skip,
                take: limit,
                include: {
                    users: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    order_items: {
                        include: {
                            products: true,
                            variant: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.orders.count({ where }),
        ]);

        return {
            data: orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                order_items: {
                    include: {
                        products: true,
                        variant: true,
                        categories: true,
                    },
                },
                custom_order_items: true,
                payments: true,
                shipping_assignments: {
                    include: {
                        delivery_agents: {
                            include: {
                                users: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        return order;
    }

    async updateStatus(id: string, dto: UpdateOrderStatusDto) {
        const order = await this.findOne(id);

        // Validate status transition
        this.validateStatusTransition(order.status, dto.status);

        const updateData: any = {
            status: dto.status,
            updatedAt: new Date(),
        };

        // Set timestamps based on status
        switch (dto.status) {
            case 'CONFIRMED':
                updateData.confirmedAt = new Date();
                updateData.confirmedBy = dto.updatedBy;
                break;
            case 'PAID':
                updateData.paidAt = new Date();
                break;
            case 'SHIPPING':
                updateData.shippedAt = new Date();
                break;
            case 'DELIVERED':
                updateData.deliveredAt = new Date();
                updateData.actualDeliveryDate = new Date();
                break;
            case 'COMPLETED':
                updateData.completedAt = new Date();
                break;
            case 'CANCELLED':
                updateData.cancelledAt = new Date();
                updateData.cancellationReason = dto.reason;
                break;
        }

        if (dto.paymentStatus) {
            updateData.paymentStatus = dto.paymentStatus;
            if (dto.paymentStatus === 'PAID') {
                updateData.paidAt = new Date();
            }
        }

        const updated = await this.prisma.orders.update({
            where: { id },
            data: updateData,
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                order_items: {
                    include: {
                        products: true,
                        variant: true,
                    },
                },
            },
        });

        return updated;
    }

    async getStats() {
        const [
            totalOrders,
            pendingOrders,
            confirmedOrders,
            shippingOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue,
            todayOrders,
        ] = await Promise.all([
            this.prisma.orders.count(),
            this.prisma.orders.count({ where: { status: 'PENDING' } }),
            this.prisma.orders.count({ where: { status: 'CONFIRMED' } }),
            this.prisma.orders.count({ where: { status: 'SHIPPING' } }),
            this.prisma.orders.count({ where: { status: 'DELIVERED' } }),
            this.prisma.orders.count({ where: { status: 'CANCELLED' } }),
            this.prisma.orders.aggregate({
                _sum: { totalCost: true },
                where: { paymentStatus: 'PAID' },
            }),
            this.prisma.orders.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);

        return {
            totalOrders,
            pendingOrders,
            confirmedOrders,
            shippingOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue: totalRevenue._sum.totalCost || 0,
            todayOrders,
        };
    }

    private validateStatusTransition(currentStatus: string, newStatus: string) {
        const validTransitions: Record<string, string[]> = {
            PENDING: ['CONFIRMED', 'PAID', 'CANCELLED'],
            CONFIRMED: ['PAID', 'PREPARING', 'CANCELLED'],
            PAID: ['PREPARING', 'CANCELLED'],
            PREPARING: ['SHIPPING', 'CANCELLED'],
            SHIPPING: ['DELIVERED', 'CANCELLED'],
            DELIVERED: ['COMPLETED'],
            COMPLETED: [],
            CANCELLED: [],
        };

        const allowed = validTransitions[currentStatus] || [];

        if (!allowed.includes(newStatus)) {
            throw new BadRequestException(
                `Cannot transition from ${currentStatus} to ${newStatus}`,
            );
        }
    }
}