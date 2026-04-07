import {
  Update,
  Ctx,
  Start,
  Action,
  On,
  Command,
  InjectBot,
} from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { BotHandler } from '../common/decorators/bot-handler.decorator';

@BotHandler()
@Update()
export class TelegramUpdate implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private readonly telegramService: TelegramService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  private async safeHandle(
    ctx: Context,
    event: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    const userId = ctx.from?.id;
    this.logger.log(`[${event}] userId=${userId}`);
    try {
      await fn();
    } catch (err) {
      this.logger.error(`[${event}] unhandled error userId=${userId}`, err);
      try {
        await ctx.reply('Что-то пошло не так. Попробуй ещё раз.');
      } catch {
        // ignore reply failure
      }
    }
  }

  async onApplicationBootstrap() {
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Начать' },
      { command: 'recent', description: 'Последние сохранёнки' },
      { command: 'all', description: 'Все сохранёнки' },
      { command: 'folders', description: 'Мои папки' },
      { command: 'newfolder', description: 'Создать папку' },
      { command: 'folder', description: 'Содержимое папки' },
      { command: 'help', description: 'Помощь' },
    ]);
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'start', () =>
      this.telegramService.handleStart(ctx),
    );
  }

  @Command('help')
  async onHelp(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'help', () =>
      this.telegramService.handleHelp(ctx),
    );
  }

  @Command('folders')
  async onFolders(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'folders', () =>
      this.telegramService.handleFoldersList(ctx),
    );
  }

  @Command('newfolder')
  async onNewFolder(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'newfolder', () =>
      this.telegramService.handleNewFolderCommand(ctx),
    );
  }

  @Command('recent')
  async onRecent(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'recent', () =>
      this.telegramService.handleRecent(ctx),
    );
  }

  @Command('all')
  async onAll(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'all', () =>
      this.telegramService.handleAll(ctx),
    );
  }

  @Command('folder')
  async onFolderContent(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'folder', () =>
      this.telegramService.handleFolderContent(ctx),
    );
  }

  @Action('auth_yes')
  async onAuthYes(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:auth_yes', () =>
      this.telegramService.handleAuthYes(ctx),
    );
  }

  @Action('auth_no')
  async onAuthNo(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:auth_no', () =>
      this.telegramService.handleAuthNo(ctx),
    );
  }

  @Action(/^folder_menu:/)
  async onFolderMenu(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:folder_menu', () =>
      this.telegramService.handleFolderMenu(ctx),
    );
  }

  @Action(/^folder_page:/)
  async onFolderPage(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:folder_page', () =>
      this.telegramService.handleFolderPage(ctx),
    );
  }

  @Action(/^pick_folder:/)
  async onPickFolder(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:pick_folder', () =>
      this.telegramService.handlePickFolder(ctx),
    );
  }

  @Action('folder_new')
  async onFolderNew(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:folder_new', () =>
      this.telegramService.handleFolderNew(ctx),
    );
  }

  @Action('folder_cancel')
  async onFolderCancel(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:folder_cancel', () =>
      this.telegramService.handleFolderCancel(ctx),
    );
  }

  @Action('search_more')
  async onSearchMore(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:search_more', () =>
      this.telegramService.handleSearchMore(ctx),
    );
  }

  @Action('all_more')
  async onAllMore(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:all_more', () =>
      this.telegramService.handleAllMore(ctx),
    );
  }

  @Action(/^browse_folder_list:/)
  async onBrowseFolderListPage(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:browse_folder_list', () =>
      this.telegramService.handleBrowseFolderListPage(ctx),
    );
  }

  @Action(/^browse_folder:/)
  async onBrowseFolder(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:browse_folder', () =>
      this.telegramService.handleBrowseFolder(ctx),
    );
  }

  @Action('browse_folder_more')
  async onBrowseFolderMore(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:browse_folder_more', () =>
      this.telegramService.handleBrowseFolderMore(ctx),
    );
  }

  @Action(/^delete_content:/)
  async onDeleteContent(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'action:delete_content', () =>
      this.telegramService.handleDeleteContent(ctx),
    );
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    await this.safeHandle(ctx, 'text', () =>
      this.telegramService.handleText(ctx),
    );
  }
}
