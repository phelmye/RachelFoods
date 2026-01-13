import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { ConsoleEmailService } from './console-email.service';
import { RealEmailService } from './real-email.service';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: EmailService,
            useFactory: (configService: ConfigService) => {
                const emailProvider = configService.get<string>(
                    'EMAIL_PROVIDER',
                    'console',
                );

                if (emailProvider === 'console' || process.env.NODE_ENV === 'development') {
                    return new ConsoleEmailService();
                } else {
                    return new RealEmailService(configService);
                }
            },
            inject: [ConfigService],
        },
    ],
    exports: [EmailService],
})
export class EmailModule { }
