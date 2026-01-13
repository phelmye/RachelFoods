import { Module } from '@nestjs/common';
import { RefillController } from './refill.controller';
import { RefillService } from './refill.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [RefillController],
    providers: [RefillService],
    exports: [RefillService],
})
export class RefillModule { }
