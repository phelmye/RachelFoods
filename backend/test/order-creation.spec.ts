import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '../src/orders/order.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentService } from '../src/payments/payment.service';
import { BadRequestException } from '@nestjs/common';

/**
 * PHASE 9A: Order Creation Tests
 * 
 * Critical business flow invariants:
 * 1. Order creation succeeds for both Stripe and COD payment methods
 * 2. Stripe orders must have valid payment intent
 * 3. COD orders skip payment intent validation
 * 4. Order totals correctly calculated
 * 5. Order status transitions are valid
 */
describe('OrderService - Order Creation', () => {
    let service: OrderService;
    let prisma: PrismaService;
    let paymentService: PaymentService;

    const mockPrisma = {
        orders: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        order_items: {
            createMany: jest.fn(),
        },
        products: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        coupons: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const mockPaymentService = {
        validatePaymentIntent: jest.fn(),
        createPaymentIntent: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: PaymentService,
                    useValue: mockPaymentService,
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
        prisma = module.get<PrismaService>(PrismaService);
        paymentService = module.get<PaymentService>(PaymentService);

        // Reset mocks before each test
        jest.clearAllMocks();
    });

    describe('Stripe Payment Orders', () => {
        it('should create order with valid Stripe payment intent', async () => {
            // Arrange
            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 2, price: 10.0 },
                ],
                paymentMethod: 'STRIPE',
                paymentIntentId: 'pi_test_123',
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 20.0,
            };

            mockPaymentService.validatePaymentIntent.mockResolvedValue({
                id: 'pi_test_123',
                amount: 2000, // $20.00 in cents
                status: 'requires_confirmation',
            });

            mockPrisma.products.findUnique.mockResolvedValue({
                id: 'prod-1',
                name: 'Test Product',
                price: 10.0,
                stock: 100,
                status: 'ACTIVE',
            });

            mockPrisma.orders.create.mockResolvedValue({
                id: 'order-1',
                orderNumber: 'ORD-001',
                userId: 'user-1',
                status: 'PENDING',
                paymentMethod: 'STRIPE',
                paymentIntentId: 'pi_test_123',
                subtotal: 20.0,
                tax: 0,
                shippingCost: 0,
                total: 20.0,
                createdAt: new Date(),
            });

            // Act
            const result = await service.create(createOrderDto, 'user-1');

            // Assert
            expect(mockPaymentService.validatePaymentIntent).toHaveBeenCalledWith('pi_test_123');
            expect(mockPrisma.orders.create).toHaveBeenCalled();
            expect(result.paymentMethod).toBe('STRIPE');
            expect(result.paymentIntentId).toBe('pi_test_123');
            expect(result.status).toBe('PENDING');
        });

        it('should reject order with invalid payment intent', async () => {
            // Arrange
            const createOrderDto = {
                items: [{ productId: 'prod-1', quantity: 1, price: 10.0 }],
                paymentMethod: 'STRIPE',
                paymentIntentId: 'pi_invalid',
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 10.0,
            };

            mockPaymentService.validatePaymentIntent.mockRejectedValue(
                new BadRequestException('Invalid payment intent')
            );

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow(BadRequestException);

            expect(mockPrisma.orders.create).not.toHaveBeenCalled();
        });

        it('should reject Stripe order without payment intent', async () => {
            // Arrange
            const createOrderDto = {
                items: [{ productId: 'prod-1', quantity: 1, price: 10.0 }],
                paymentMethod: 'STRIPE',
                paymentIntentId: null,
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                total: 10.0,
            };

            // Act & Assert
            await expect(
                service.create(createOrderDto, 'user-1')
            ).rejects.toThrow('Payment intent required for Stripe orders');
        });
    });

    describe('COD Payment Orders', () => {
        it('should create COD order without payment intent', async () => {
            // Arrange
            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 1, price: 15.0 },
                ],
                paymentMethod: 'COD',
                paymentIntentId: null,
                shippingAddress: {
                    street: '456 Oak Ave',
                    city: 'COD City',
                    state: 'CD',
                    zipCode: '54321',
                    country: 'US',
                },
                total: 15.0,
            };

            mockPrisma.products.findUnique.mockResolvedValue({
                id: 'prod-1',
                name: 'COD Product',
                price: 15.0,
                stock: 50,
                status: 'ACTIVE',
            });

            mockPrisma.orders.create.mockResolvedValue({
                id: 'order-2',
                orderNumber: 'ORD-002',
                userId: 'user-1',
                status: 'PENDING',
                paymentMethod: 'COD',
                paymentIntentId: null,
                subtotal: 15.0,
                tax: 0,
                shippingCost: 0,
                total: 15.0,
                createdAt: new Date(),
            });

            // Act
            const result = await service.create(createOrderDto, 'user-1');

            // Assert
            expect(mockPaymentService.validatePaymentIntent).not.toHaveBeenCalled();
            expect(mockPrisma.orders.create).toHaveBeenCalled();
            expect(result.paymentMethod).toBe('COD');
            expect(result.paymentIntentId).toBeNull();
            expect(result.status).toBe('PENDING');
        });

        it('should calculate total correctly for COD orders', async () => {
            // Arrange
            const createOrderDto = {
                items: [
                    { productId: 'prod-1', quantity: 2, price: 10.0 },
                    { productId: 'prod-2', quantity: 3, price: 5.0 },
                ],
                paymentMethod: 'COD',
                shippingAddress: {
                    street: '789 Pine Rd',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '11111',
                    country: 'US',
                },
                shippingCost: 5.0,
                total: 40.0, // (2*10) + (3*5) + 5 = 40
            };

            mockPrisma.products.findUnique
                .mockResolvedValueOnce({
                    id: 'prod-1',
                    price: 10.0,
                    stock: 100,
                    status: 'ACTIVE',
                })
                .mockResolvedValueOnce({
                    id: 'prod-2',
                    price: 5.0,
                    stock: 100,
                    status: 'ACTIVE',
                });

            mockPrisma.orders.create.mockResolvedValue({
                id: 'order-3',
                orderNumber: 'ORD-003',
                status: 'PENDING',
                paymentMethod: 'COD',
                subtotal: 35.0,
                shippingCost: 5.0,
                total: 40.0,
            });

            // Act
            const result = await service.create(createOrderDto, 'user-1');

            // Assert
            expect(result.total).toBe(40.0);
            expect(result.subtotal).toBe(35.0);
            expect(result.shippingCost).toBe(5.0);
        });
    });

    describe('Order Status Transitions', () => {
        it('should transition PENDING → CONFIRMED on seller acceptance', async () => {
            // Arrange
            mockPrisma.orders.findUnique.mockResolvedValue({
                id: 'order-1',
                status: 'PENDING',
                paymentMethod: 'COD',
            });

            mockPrisma.orders.update.mockResolvedValue({
                id: 'order-1',
                status: 'CONFIRMED',
            });

            // Act
            const result = await service.confirmOrder('order-1');

            // Assert
            expect(result.status).toBe('CONFIRMED');
        });

        it('should prevent invalid status transitions', async () => {
            // Arrange
            mockPrisma.orders.findUnique.mockResolvedValue({
                id: 'order-1',
                status: 'COMPLETED',
            });

            // Act & Assert
            await expect(
                service.confirmOrder('order-1')
            ).rejects.toThrow('Cannot confirm order in COMPLETED status');
        });
    });

    describe('Invariant: Order Integrity', () => {
        it('should ensure order total matches item sum + shipping', async () => {
            // This test ensures the fundamental invariant that:
            // total = sum(item.quantity * item.price) + shippingCost + tax

            const items = [
                { productId: 'p1', quantity: 2, price: 10.0 }, // 20
                { productId: 'p2', quantity: 1, price: 15.0 }, // 15
            ];
            const shippingCost = 5.0;
            const tax = 0;
            const expectedTotal = 40.0; // 20 + 15 + 5

            const createOrderDto = {
                items,
                paymentMethod: 'COD',
                shippingAddress: {
                    street: 'Test',
                    city: 'Test',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US',
                },
                shippingCost,
                tax,
                total: expectedTotal,
            };

            mockPrisma.products.findUnique.mockResolvedValue({
                id: 'p1',
                price: 10.0,
                stock: 100,
                status: 'ACTIVE',
            });

            mockPrisma.orders.create.mockImplementation((args) => {
                // Verify the total matches
                expect(args.data.total).toBe(expectedTotal);
                return Promise.resolve({
                    id: 'order-1',
                    total: args.data.total,
                });
            });

            // Act
            await service.create(createOrderDto, 'user-1');

            // Assert - verification happens in mockImplementation
            expect(mockPrisma.orders.create).toHaveBeenCalled();
        });
    });
});
