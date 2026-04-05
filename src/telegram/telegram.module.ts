import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { TelegramUpdate } from './telegram.update';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { ContentModule } from '../content/content.module';
import { PreviewLinkModule } from '../preview-link/preview-link.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
        launchOptions:
          configService.get<string>('NODE_ENV') === 'production' ? false : {},
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MailModule,
    ContentModule,
    PreviewLinkModule,
    FoldersModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramUpdate, TelegramService],
})
export class TelegramModule {}
