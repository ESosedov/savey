import { SetMetadata } from '@nestjs/common';

export const IS_BOT_HANDLER_KEY = 'isBotHandler';
export const BotHandler = () => SetMetadata(IS_BOT_HANDLER_KEY, true);
