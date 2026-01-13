import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PromotionController],
    providers: [PromotionService],
    exports: [PromotionService],
})
export class PromotionModule { }
