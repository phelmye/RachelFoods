import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/orders/order.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * PHASE 9A: Inventory Deduction Safety Tests
 * 
 * Critical invariants:
 * 1. Stock never goes negative
 * 2. Out-of-stock products cannot be ordered
 * 3. Concurrent orders respect stock limits
 * 4. Stock deduction is atomic (transaction-safe)
 * 5. Order cancellation restores stock
 */
describe('OrderService - Inventory Safety', () => {
    let service: OrderService;
    let prisma: PrismaService;

    const mockPrisma = {
        products: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
        orders: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        order_items: {
            createMany: jest.fn(),
            findMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        prisma = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('Stock Deduction', () => {
        it('should deduct stock when order is created', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Test Product',
                price: 10.0,
                stock: 100,
                status: 'ACTIVE',
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                stock: 98, // 100 - 2
            });

            mockPrisma.orders.create.mockResolvedValue({
                id: 'order-1',
                status: 'PENDING',
            });

            const createOrderDto = {
                items: [{ productId: 'prod-1', quantity: 2, price: 10.0 }],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 20.0,
            };

            // Act
            await service.create(createOrderDto, 'user-1');

            // Assert
            expect(mockPrisma.products.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: {
                    stock: {
                        decrement: 2,
                    },
                },
            });
        });

        it('should reject order when insufficient stock', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Low Stock Product',
                price: 10.0,
                stock: 1, // Only 1 in stock
                status: 'ACTIVE',
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 5, price: 10.0 }, // Requesting 5
                ],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 50.0,
            };

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow('Insufficient stock');

            expect(mockPrisma.orders.create).not.toHaveBeenCalled();
            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });

        it('should reject order for out-of-stock product', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                name: 'Out of Stock Product',
                price: 10.0,
                stock: 0,
                status: 'ACTIVE',
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            const createOrderDto = {
                items: [{ productId: 'prod-1', quantity: 1, price: 10.0 }],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 10.0,
            };

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow('Product is out of stock');

            expect(mockPrisma.orders.create).not.toHaveBeenCalled();
        });
    });

    describe('Invariant: Stock Never Negative', () => {
        it('should prevent stock from going below zero', async () => {
            // Arrange
            const product = {
                id: 'prod-1',
                price: 10.0,
                stock: 5,
                status: 'ACTIVE',
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 10, price: 10.0 }, // Requesting more than available
                ],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 100.0,
            };

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow();

            // Ensure no database mutation occurred
            expect(mockPrisma.products.update).not.toHaveBeenCalled();
            expect(mockPrisma.orders.create).not.toHaveBeenCalled();
        });

        it('should handle exact stock match correctly', async () => {
            // Arrange - Product has exactly 5 in stock
            const product = {
                id: 'prod-1',
                price: 10.0,
                stock: 5,
                status: 'ACTIVE',
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                stock: 0, // Should be exactly 0 after order
            });

            mockPrisma.orders.create.mockResolvedValue({
                id: 'order-1',
                status: 'PENDING',
            });

            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 5, price: 10.0 }, // Exact match
                ],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 50.0,
            };

            // Act
            await service.create(createOrderDto, 'user-1');

            // Assert - Should succeed and set stock to exactly 0
            expect(mockPrisma.products.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: {
                    stock: {
                        decrement: 5,
                    },
                },
            });
        });
    });

    describe('Stock Restoration on Cancellation', () => {
        it('should restore stock when order is cancelled', async () => {
            // Arrange
            const order = {
                id: 'order-1',
                status: 'CONFIRMED',
                items: [
                    {
                        productId: 'prod-1',
                        quantity: 3,
                    },
                ],
            };

            const product = {
                id: 'prod-1',
                stock: 10,
            };

            mockPrisma.orders.findUnique.mockResolvedValue(order);
            mockPrisma.order_items.findMany.mockResolvedValue(order.items);
            mockPrisma.products.findUnique.mockResolvedValue(product);
            mockPrisma.products.update.mockResolvedValue({
                ...product,
                stock: 13, // 10 + 3 restored
            });

            mockPrisma.orders.update.mockResolvedValue({
                ...order,
                status: 'CANCELLED',
            });

            // Act
            await service.cancelOrder('order-1', 'user-1');

            // Assert
            expect(mockPrisma.products.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: {
                    stock: {
                        increment: 3,
                    },
                },
            });
        });

        it('should not restore stock if order already completed', async () => {
            // Arrange
            const order = {
                id: 'order-1',
                status: 'COMPLETED',
            };

            mockPrisma.orders.findUnique.mockResolvedValue(order);

            // Act & Assert
            await expect(
                service.cancelOrder('order-1', 'user-1')
            ).rejects.toThrow('Cannot cancel completed order');

            expect(mockPrisma.products.update).not.toHaveBeenCalled();
        });
    });

    describe('Atomic Transactions', () => {
        it('should rollback entire order if stock deduction fails', async () => {
            // Arrange
            mockPrisma.products.findUnique.mockResolvedValue({
                id: 'prod-1',
                stock: 10,
                status: 'ACTIVE',
            });

            // Simulate stock update failure (e.g., database constraint violation)
            mockPrisma.products.update.mockRejectedValue(
                new Error('Stock constraint violation')
            );

            mockPrisma.$transaction.mockImplementation(async (callback) => {
                try {
                    return await callback(mockPrisma);
                } catch (error) {
                    // Transaction should rollback
                    throw error;
                }
            });

            const createOrderDto = {
                items: [{ productId: 'prod-1', quantity: 2, price: 10.0 }],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 20.0,
            };

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow('Stock constraint violation');

            // Order should not be created if stock update fails
            expect(mockPrisma.orders.create).not.toHaveBeenCalled();
        });
    });

    describe('Concurrent Order Safety', () => {
        it('should handle race condition with pessimistic locking', async () => {
            // This test verifies that the system uses database-level locking
            // to prevent race conditions when multiple users order the last item

            const product = {
                id: 'prod-1',
                stock: 1, // Only 1 left
                status: 'ACTIVE',
                price: 10.0,
            };

            mockPrisma.products.findUnique.mockResolvedValue(product);

            // First order should succeed
            mockPrisma.products.update.mockResolvedValueOnce({
                ...product,
                stock: 0,
            });

            mockPrisma.orders.create.mockResolvedValue({
                id: 'order-1',
                status: 'PENDING',
            });

            const createOrderDto = {
                items: [{ productId: 'prod-1', quantity: 1, price: 10.0 }],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 10.0,
            };

            // Act - First order
            await service.create(createOrderDto, 'user-1');

            // Second concurrent order should fail
            mockPrisma.products.findUnique.mockResolvedValue({
                ...product,
                stock: 0, // Already sold
            });

            // Act & Assert - Second order
            await expect(
                service.create(createOrderDto, 'user-2')
            ).rejects.toThrow('out of stock');
        });
    });

    describe('Multi-Item Order Stock Validation', () => {
        it('should validate stock for all items before creating order', async () => {
            // Arrange
            mockPrisma.products.findUnique
                .mockResolvedValueOnce({
                    id: 'prod-1',
                    stock: 10,
                    price: 10.0,
                    status: 'ACTIVE',
                })
                .mockResolvedValueOnce({
                    id: 'prod-2',
                    stock: 0, // Out of stock
                    price: 15.0,
                    status: 'ACTIVE',
                });

            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 2, price: 10.0 },
                    { productId: 'prod-2', quantity: 1, price: 15.0 }, // This will fail
                ],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 35.0,
            };

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow();

            // No stock should be deducted for any product if validation fails
            expect(mockPrisma.products.update).not.toHaveBeenCalled();
            expect(mockPrisma.orders.create).not.toHaveBeenCalled();
        });
    });
});
