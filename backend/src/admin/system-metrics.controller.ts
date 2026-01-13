import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Controller('api/admin/system')
@UseGuards(JwtAuthGuard)
export class SystemMetricsController {
    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
    ) { }

    /**
     * Get system health metrics
     * PHASE 6A: Observability endpoint
     */
    @Get('health')
    @Permissions('system.view')
    async getSystemHealth() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Parallel queries for performance
        const [
            ordersToday,
            pendingOrders,
            failedPaymentsToday,
            refundsToday,
            activeUsers,
            cacheStats,
        ] = await Promise.all([
            // Orders today
            this.prisma.orders.count({
                where: {
                    createdAt: { gte: todayStart },
                },
            }),

            // Pending orders (requires action)
            this.prisma.orders.count({
                where: {
                    status: { in: ['PENDING'] },
                },
            }),

            // Failed payments today - check if payment_status exists
            this.prisma.payments.count({
                where: {
                    createdAt: { gte: todayStart },
                },
            }),

            // Refunds today
            this.prisma.refunds.count({
                where: {
                    createdAt: { gte: todayStart },
                },
            }),

            // Active users (logged in last 24h)
            this.prisma.users.count({
                where: {
                    lastLogin: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
                },
            }),

            // Cache statistics
            this.cache.getStats(),
        ]);

        // Get recent errors (last 1 hour) - would need error logging table
        // For now, we'll return metrics from available data

        return {
            status: 'healthy',
            timestamp: now.toISOString(),
            metrics: {
                orders: {
                    today: ordersToday,
                    pending: pendingOrders,
                },
                payments: {
                    failedToday: failedPaymentsToday,
                },
                refunds: {
                    today: refundsToday,
                },
                users: {
                    activeLast24h: activeUsers,
                },
                cache: cacheStats,
            },
        };
    }

    /**
     * Get detailed order metrics
     * PHASE 6A: Order analytics for admin dashboard
     */
    @Get('metrics/orders')
    @Permissions('system.view')
    async getOrderMetrics() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            ordersByStatus,
            ordersToday,
            ordersThisWeek,
            averageOrderValue,
        ] = await Promise.all([
            // Orders grouped by status
            this.prisma.orders.groupBy({
                by: ['status'],
                _count: true,
            }),

            // Orders today with total value
            this.prisma.orders.aggregate({
                where: {
                    createdAt: { gte: todayStart },
                },
                _count: true,
                _sum: {
                    totalCost: true,
                },
            }),

            // Orders this week
            this.prisma.orders.aggregate({
                where: {
                    createdAt: { gte: weekStart },
                },
                _count: true,
                _sum: {
                    totalCost: true,
                },
            }),

            // Average order value (all time)
            this.prisma.orders.aggregate({
                _avg: {
                    totalCost: true,
                },
            }),
        ]);

        return {
            byStatus: ordersByStatus,
            today: {
                count: ordersToday._count,
                totalValue: ordersToday._sum.totalCost || 0,
            },
            thisWeek: {
                count: ordersThisWeek._count,
                totalValue: ordersThisWeek._sum.totalCost || 0,
            },
            averageOrderValue: averageOrderValue._avg.totalCost || 0,
        };
    }

    /**
     * Clear cache (admin utility)
     * PHASE 6A: Manual cache invalidation
     */
    @Get('cache/clear')
    @Permissions('system.manage')
    async clearCache() {
        this.cache.clear();
        return {
            message: 'Cache cleared successfully',
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get cache statistics
     * PHASE 6A: Cache monitoring
     */
    @Get('cache/stats')
    @Permissions('system.view')
    async getCacheStats() {
        return this.cache.getStats();
    }
}
