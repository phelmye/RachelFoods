import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { KitchenRefillService } from './kitchen-refill.service';
import { OrderController } from './order.controller';
import { NotificationService } from './notification.service';
import { OrderEmailHelper } from './order-email.helper';
import { ShippingEngine } from './shipping/shipping.engine';
import { InternalShippingProvider } from './shipping/internal-shipping.provider';
import { ThirdPartyShippingProvider } from './shipping/third-party-shipping.provider';
import { CustomShippingProvider } from './shipping/custom-shipping.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewModule } from '../reviews/review.module';
import { ReviewService } from '../reviews/review.service';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule as AdminNotificationModule } from '../notifications/notification.module';
import { PromotionModule } from '../promotion/promotion.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => ReviewModule),
        AuthModule,
        EmailModule,
        AdminNotificationModule,
        PromotionModule,
        WalletModule, // PHASE 5C: Wallet integration
    ],
    controllers: [OrderController],
    providers: [
        OrderService,
        KitchenRefillService,
        NotificationService,
        OrderEmailHelper,
        ShippingEngine,
        InternalShippingProvider,
        ThirdPartyShippingProvider,
        CustomShippingProvider,
    ],
    exports: [OrderService, KitchenRefillService, NotificationService, OrderEmailHelper],
})
export class OrderModule { }
