import {
  Controller,
  Post,
  Body,
  OnModuleInit,
  Logger,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Public } from '../common/decorators/public.decorator';

@Controller('telegram')
export class TelegramController implements OnModuleInit {
  private readonly logger = new Logger(TelegramController.name);
  private webhookSecret: string;

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>(
      'TELEGRAM_WEBHOOK_SECRET',
    );
  }

  async onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      const domain = this.configService.getOrThrow<string>('PUBLIC_DOMAIN');
      const webhookUrl = `${domain}/api/telegram/webhook`;
      await this.bot.telegram.setWebhook(webhookUrl, {
        secret_token: this.webhookSecret,
      });
      this.logger.log(`Telegram webhook set: ${webhookUrl}`);
    }
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') secret: string,
  ) {
    if (secret !== this.webhookSecret) {
      throw new ForbiddenException();
    }
    await this.bot.handleUpdate(update);
  }
}
