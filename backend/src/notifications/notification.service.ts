import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

export enum AdminNotificationType {
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    COD_PENDING_LONG = 'COD_PENDING_LONG',
    ORDER_STUCK_PREPARING = 'ORDER_STUCK_PREPARING',
    LOW_STOCK = 'LOW_STOCK',
    CUSTOM_ITEM_REQUEST = 'CUSTOM_ITEM_REQUEST',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
}

export enum NotificationPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        private configService: ConfigService,
    ) { }

    /**
     * Create admin notification
     */
    async createAdminNotification(
        type: AdminNotificationType,
        title: string,
        message: string,
        options?: {
            orderId?: string;
            userId?: string;
            priority?: NotificationPriority;
            metadata?: any;
            sendEmail?: boolean;
        },
    ) {
        try {
            // Create notification in database
            const notification = await this.prisma.admin_notifications.create({
                data: {
                    type,
                    title,
                    message,
                    orderId: options?.orderId,
                    userId: options?.userId,
                    priority: options?.priority || NotificationPriority.NORMAL,
                    metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
                },
            });

            this.logger.log(
                `Admin notification created: ${type} - ${title}`,
                options?.metadata,
            );

            // Send email if configured and requested
            if (options?.sendEmail !== false) {
                await this.sendAdminEmailAlert(type, title, message, options?.metadata);
            }

            return notification;
        } catch (error) {
            this.logger.error(
                `Failed to create admin notification: ${error.message}`,
                error.stack,
            );
            // Don't throw - notification failures should not break business logic
        }
    }

    /**
     * Send email alert to admins
     */
    private async sendAdminEmailAlert(
        type: string,
        title: string,
        message: string,
        metadata?: any,
    ) {
        try {
            const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
            const sendAdminEmails = this.configService.get<boolean>(
                'SEND_ADMIN_EMAIL_ALERTS',
                false,
            );

            if (!sendAdminEmails || !adminEmail) {
                this.logger.debug('Admin email alerts disabled or no admin email configured');
                return;
            }

            await this.emailService.sendAdminAlertEmail(
                adminEmail,
                title,
                message,
                metadata,
            );
        } catch (error) {
            this.logger.error(`Failed to send admin email alert: ${error.message}`);
            // Don't throw - email failures should not break notification creation
        }
    }

    /**
     * Get all admin notifications
     */
    async getAdminNotifications(filters?: {
        isRead?: boolean;
        type?: string;
        priority?: string;
        limit?: number;
    }) {
        const where: any = {};

        if (filters?.isRead !== undefined) {
            where.isRead = filters.isRead;
        }
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.priority) {
            where.priority = filters.priority;
        }

        return this.prisma.admin_notifications.findMany({
            where,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            take: filters?.limit || 50,
            include: {
                orders: {
                    select: {
                        orderNumber: true,
                        status: true,
                        totalCost: true,
                    },
                },
                users: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string) {
        return this.prisma.admin_notifications.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        return this.prisma.admin_notifications.updateMany({
            where: { isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string) {
        return this.prisma.admin_notifications.delete({
            where: { id: notificationId },
        });
    }

    /**
     * Get unread count
     */
    async getUnreadCount() {
        return this.prisma.admin_notifications.count({
            where: { isRead: false },
        });
    }

    // ============================================================
    // Specific Alert Methods
    // ============================================================

    async alertPaymentFailed(orderId: string, reason: string) {
        return this.createAdminNotification(
            AdminNotificationType.PAYMENT_FAILED,
            'Payment Failed',
            `Payment failed for order. Reason: ${reason}`,
            {
                orderId,
                priority: NotificationPriority.HIGH,
                metadata: { reason },
            },
        );
    }

    async alertCODPendingLong(orderId: string, hoursPending: number) {
        return this.createAdminNotification(
            AdminNotificationType.COD_PENDING_LONG,
            'COD Order Pending Too Long',
            `COD order has been pending for ${hoursPending} hours`,
            {
                orderId,
                priority: NotificationPriority.HIGH,
                metadata: { hoursPending },
            },
        );
    }

    async alertOrderStuckPreparing(orderId: string, hoursStuck: number) {
        return this.createAdminNotification(
            AdminNotificationType.ORDER_STUCK_PREPARING,
            'Order Stuck in Preparing',
            `Order has been in PREPARING status for ${hoursStuck} hours`,
            {
                orderId,
                priority: NotificationPriority.NORMAL,
                metadata: { hoursStuck },
            },
        );
    }
}
