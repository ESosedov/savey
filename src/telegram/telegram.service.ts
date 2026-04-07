import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import type { InlineKeyboardMarkup } from '@telegraf/types';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { ContentService } from '../content/content.service';
import { PreviewLinkService } from '../preview-link/preview-link.service';
import { FoldersService } from '../folders/folders.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { ContentDto as SavedContentDto } from '../content/dto/content.dto';
import { ContentDto as PreviewDto } from '../preview-link/dto/content.dto';
import { FolderDto } from '../folders/dto/folder.dto';
import { CreateFolderDto } from '../folders/dto/create-folder.dto';

type UserState =
  | { step: 'awaiting_email'; action: 'link' | 'register' }
  | { step: 'awaiting_code'; action: 'link' | 'register'; email: string }
  | { step: 'awaiting_folder_name'; contentId?: string }
  | { step: 'awaiting_search_query' };

interface PendingSearch {
  query: string;
  nextCursor: string;
}

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: '🔍 Поиск' }, { text: '📚 Все ссылки' }],
    [{ text: '📁 Папки' }, { text: '⏱ Недавние' }],
  ],
  resize_keyboard: true,
  persistent: true,
};

const MAIN_KEYBOARD_BUTTONS = new Set(['🔍 Поиск', '📚 Все ссылки', '📁 Папки', '⏱ Недавние']);

const CONTENT_PAGE_SIZE = 5;

const FOLDERS_PAGE_SIZE = 8;
const SEARCH_PAGE_SIZE = 5;

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly states = new Map<number, UserState>();
  private readonly pendingFolderSelections = new Map<number, string>();
  private readonly pendingSearches = new Map<number, PendingSearch>();
  private readonly pendingListPagination = new Map<number, string>();
  private readonly pendingFolderBrowse = new Map<number, { folderId: string; cursor?: string }>();

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly contentService: ContentService,
    private readonly previewLinkService: PreviewLinkService,
    private readonly foldersService: FoldersService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // ─── /start ──────────────────────────────────────────────────────────────

  async handleStart(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    this.states.delete(telegramId);
    this.pendingFolderSelections.delete(telegramId);
    this.pendingSearches.delete(telegramId);

    const existingUser = await this.usersService.findByTelegramId(telegramId);
    if (existingUser) {
      this.logger.log(
        `returning user telegramId=${telegramId} userId=${existingUser.id}`,
      );
      await ctx.reply(
        `С возвращением, ${existingUser.firstName}! Кидай ссылку — я сохраню.`,
        { reply_markup: MAIN_KEYBOARD },
      );
      return;
    }

    this.logger.log(`new user telegramId=${telegramId}`);

    await ctx.reply(
      `Привет! Я бот Savey — помогу сохранять и находить ссылки.\n\n` +
        `Ты уже пользуешься приложением Savey? Если да, я могу привязать ` +
        `твой Telegram к существующему аккаунту и все сохранённые ссылки будут доступны и здесь.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Да, у меня есть аккаунт', callback_data: 'auth_yes' }],
            [{ text: 'Нет, я новый пользователь', callback_data: 'auth_no' }],
          ],
        },
      },
    );
  }

  // ─── /help ───────────────────────────────────────────────────────────────

  async handleHelp(ctx: Context) {
    await ctx.reply(
      `<b>Savey Bot</b> — сохраняй и находи ссылки прямо в Telegram.\n\n` +
        `<b>Сохранить ссылку:</b>\nПросто кинь URL в чат — я сохраню и покажу карточку.\n\n` +
        `<b>Найти:</b>\nНапиши любой текст — я поищу по твоим сохранёнкам.\n\n` +
        `<b>Команды:</b>\n` +
        `/recent — последние 5 сохранёнок\n` +
        `/all — все сохранёнки\n` +
        `/folders — список папок\n` +
        `/folder <название> — содержимое папки\n` +
        `/newfolder <название> — создать папку\n` +
        `/help — эта справка`,
      { parse_mode: 'HTML' },
    );
  }

  // ─── Авторизация ──────────────────────────────────────────────────────────

  async handleAuthYes(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.answerCbQuery();
    this.states.set(telegramId, { step: 'awaiting_email', action: 'link' });

    await ctx.editMessageText(
      'Введи email, с которым ты регистрировался в Savey.\n' +
        'Я отправлю на него код подтверждения.',
    );
  }

  async handleAuthNo(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.answerCbQuery();

    await ctx.editMessageText(
      `Отлично! Просто кинь мне ссылку — я создам аккаунт автоматически.\n\n` +
        `Если захочешь позже привязать email — используй /link.`,
    );
    await ctx.reply('Выбирай действие:', { reply_markup: MAIN_KEYBOARD });
  }

  // ─── Входящий текст ───────────────────────────────────────────────────────

  async handleText(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !('text' in ctx.message!)) return;

    const text = ctx.message.text;

    // Ignore unknown commands
    if (text.startsWith('/')) return;

    const state = this.states.get(telegramId);

    if (state) {
      if (state.step === 'awaiting_email') {
        return this.handleEmailInput(ctx, telegramId, text, state.action);
      }
      if (state.step === 'awaiting_code') {
        return this.handleCodeInput(ctx, telegramId, text, state.email);
      }
      if (state.step === 'awaiting_folder_name') {
        return this.handleFolderNameInput(
          ctx,
          telegramId,
          text,
          state.contentId,
        );
      }
      if (state.step === 'awaiting_search_query') {
        this.states.delete(telegramId);
        return this.handleSearch(ctx, telegramId, text);
      }
    }

    // Кнопки постоянной клавиатуры
    if (MAIN_KEYBOARD_BUTTONS.has(text)) {
      if (text === '🔍 Поиск') {
        this.states.set(telegramId, { step: 'awaiting_search_query' });
        await ctx.reply('Введи поисковый запрос:');
        return;
      }
      if (text === '📚 Все ссылки') return this.handleAll(ctx);
      if (text === '📁 Папки') return this.handleFoldersList(ctx);
      if (text === '⏱ Недавние') return this.handleRecent(ctx);
    }

    if (this.isUrl(text)) {
      return this.handleUrl(ctx, telegramId, text);
    }

    return this.handleSearch(ctx, telegramId, text);
  }

  // ─── Удаление контента ────────────────────────────────────────────────────

  async handleDeleteContent(ctx: Context) {
    await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data as string;
    const contentId = data.replace('delete_content:', '');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Пользователь не найден. Нажми /start.');
      return;
    }

    try {
      await this.contentService.remove(contentId, user.id);
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply('Удалено.');
    } catch {
      await ctx.reply('Не удалось удалить. Попробуй ещё раз.');
    }
  }

  // ─── Папки — выбор при сохранении ────────────────────────────────────────

  async handleFolderMenu(ctx: Context) {
    await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data as string;
    const contentId = data.replace('folder_menu:', '');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Пользователь не найден. Нажми /start.');
      return;
    }

    this.pendingFolderSelections.set(telegramId, contentId);

    const folders = await this.foldersService.getList({}, user.id);
    await this.sendFolderPage(ctx, folders, 0, 'edit');
  }

  async handleFolderPage(ctx: Context) {
    await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data as string;
    const page = parseInt(data.replace('folder_page:', ''), 10);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const folders = await this.foldersService.getList({}, user.id);
    await this.sendFolderPage(ctx, folders, page, 'edit');
  }

  async handlePickFolder(ctx: Context) {
    await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data as string;
    const folderId = data.replace('pick_folder:', '');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const contentId = this.pendingFolderSelections.get(telegramId);
    if (!contentId) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      return;
    }

    try {
      await this.contentService.addToFolder(contentId, { folderId }, user.id);
      this.pendingFolderSelections.delete(telegramId);

      const folder = await this.foldersService.findById(folderId, user.id);
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply(`Сохранено в «${folder.title ?? 'папку'}».`);
    } catch {
      await ctx.reply('Не удалось добавить в папку. Попробуй ещё раз.');
    }
  }

  async handleFolderNew(ctx: Context) {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const contentId = this.pendingFolderSelections.get(telegramId);
    this.states.set(telegramId, {
      step: 'awaiting_folder_name',
      contentId,
    });

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply('Введи название новой папки:');
  }

  async handleFolderCancel(ctx: Context) {
    await ctx.answerCbQuery('Отменено');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    this.pendingFolderSelections.delete(telegramId);
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  }

  // ─── /folders и /newfolder ────────────────────────────────────────────────

  async handleFoldersList(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Сначала нажми /start.');
      return;
    }

    const folders = await this.foldersService.getList({}, user.id);
    await this.sendFolderBrowsePage(ctx, folders, 0, 'reply');
  }

  async handleBrowseFolderListPage(ctx: Context) {
    await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data as string;
    const page = parseInt(data.replace('browse_folder_list:', ''), 10);
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const folders = await this.foldersService.getList({}, user.id);
    await this.sendFolderBrowsePage(ctx, folders, page, 'edit');
  }

  async handleBrowseFolder(ctx: Context) {
    await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data as string;
    const folderId = data.replace('browse_folder:', '');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const folder = await this.foldersService.findById(folderId, user.id);
    const result = await this.contentService.getContentWithPagination(user.id, {
      folderId,
      limit: CONTENT_PAGE_SIZE,
    });

    if (result.data.length === 0) {
      await ctx.editMessageText(
        `📁 <b>${this.escapeHtml(folder.title ?? 'Папка')}</b>\n\nПапка пуста.`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '← Назад', callback_data: 'browse_folder_list:0' }]] } },
      );
      return;
    }

    if (result.pagination.hasMore && result.pagination.nextCursor) {
      this.pendingFolderBrowse.set(telegramId, { folderId, cursor: result.pagination.nextCursor });
    } else {
      this.pendingFolderBrowse.delete(telegramId);
    }

    const { text, keyboard } = this.formatContentList(
      result.data,
      `📁 <b>${this.escapeHtml(folder.title ?? 'Папка')}</b>:`,
      result.pagination.hasMore,
      { more: 'browse_folder_more', back: 'browse_folder_list:0' },
    );
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async handleBrowseFolderMore(ctx: Context) {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const pending = this.pendingFolderBrowse.get(telegramId);
    if (!pending?.cursor) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      return;
    }

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const folder = await this.foldersService.findById(pending.folderId, user.id);
    const result = await this.contentService.getContentWithPagination(user.id, {
      folderId: pending.folderId,
      limit: CONTENT_PAGE_SIZE,
      cursor: pending.cursor,
    });

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (result.data.length === 0) {
      this.pendingFolderBrowse.delete(telegramId);
      await ctx.reply('Больше нет.');
      return;
    }

    if (result.pagination.hasMore && result.pagination.nextCursor) {
      this.pendingFolderBrowse.set(telegramId, { folderId: pending.folderId, cursor: result.pagination.nextCursor });
    } else {
      this.pendingFolderBrowse.delete(telegramId);
    }

    const { text, keyboard } = this.formatContentList(
      result.data,
      `📁 <b>${this.escapeHtml(folder.title ?? 'Папка')}</b> (продолжение):`,
      result.pagination.hasMore,
      { more: 'browse_folder_more' },
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async handleNewFolderCommand(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !('text' in ctx.message!)) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Сначала нажми /start.');
      return;
    }

    const args = ctx.message.text.replace(/^\/newfolder\s*/i, '').trim();

    if (!args) {
      await ctx.reply('Укажи название: /newfolder Моя папка');
      return;
    }

    const dto: CreateFolderDto = { title: args, description: '' };
    const folder = await this.foldersService.create(dto, user.id);
    await ctx.reply(`Папка «${folder.title}» создана.`);
  }

  // ─── Просмотр (/recent, /all, /folder) ───────────────────────────────────

  async handleRecent(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Сначала нажми /start.');
      return;
    }

    const result = await this.contentService.getContentWithPagination(user.id, {
      limit: CONTENT_PAGE_SIZE,
    });

    if (result.data.length === 0) {
      await ctx.reply(
        'У тебя пока нет сохранённых ссылок. Кидай URL — я сохраню!',
      );
      return;
    }

    const { text, keyboard } = this.formatContentList(
      result.data,
      '🕐 Последние сохранёнки:',
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async handleAll(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Сначала нажми /start.');
      return;
    }

    const result = await this.contentService.getContentWithPagination(user.id, {
      limit: CONTENT_PAGE_SIZE,
    });

    if (result.data.length === 0) {
      await ctx.reply(
        'У тебя пока нет сохранённых ссылок. Кидай URL — я сохраню!',
      );
      return;
    }

    if (result.pagination.hasMore && result.pagination.nextCursor) {
      this.pendingListPagination.set(telegramId, result.pagination.nextCursor);
    } else {
      this.pendingListPagination.delete(telegramId);
    }

    const { text, keyboard } = this.formatContentList(
      result.data,
      '📋 Все сохранёнки:',
      result.pagination.hasMore,
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async handleAllMore(ctx: Context) {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const nextCursor = this.pendingListPagination.get(telegramId);
    if (!nextCursor) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      return;
    }

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const result = await this.contentService.getContentWithPagination(user.id, {
      limit: CONTENT_PAGE_SIZE,
      cursor: nextCursor,
    });

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (result.data.length === 0) {
      await ctx.reply('Больше сохранёнок нет.');
      this.pendingListPagination.delete(telegramId);
      return;
    }

    if (result.pagination.hasMore && result.pagination.nextCursor) {
      this.pendingListPagination.set(telegramId, result.pagination.nextCursor);
    } else {
      this.pendingListPagination.delete(telegramId);
    }

    const { text, keyboard } = this.formatContentList(
      result.data,
      '📋 Продолжение:',
      result.pagination.hasMore,
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async handleFolderContent(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId || !('text' in ctx.message!)) return;

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Сначала нажми /start.');
      return;
    }

    const name = ctx.message.text.replace(/^\/folder\s*/i, '').trim();

    if (!name) {
      await ctx.reply('Укажи название папки: /folder Моя папка');
      return;
    }

    const folders = await this.foldersService.getList(
      { search: name },
      user.id,
    );

    if (folders.length === 0) {
      await ctx.reply(
        `Папка «<b>${this.escapeHtml(name)}</b>» не найдена. Список папок — /folders`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const folder = folders[0];

    const result = await this.contentService.getContentWithPagination(user.id, {
      folderId: folder.id,
      limit: CONTENT_PAGE_SIZE,
    });

    if (result.data.length === 0) {
      await ctx.reply(
        `Папка «<b>${this.escapeHtml(folder.title ?? name)}</b>» пуста.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const { text, keyboard } = this.formatContentList(
      result.data,
      `📁 <b>${this.escapeHtml(folder.title ?? name)}</b>:`,
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  // ─── Поиск ────────────────────────────────────────────────────────────────

  async handleSearch(ctx: Context, telegramId: number, query: string) {
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply(
        'Привет! Кидай ссылку — я сохраню её и ты сможешь искать по ним.',
      );
      return;
    }

    this.logger.log(`search userId=${user.id} query="${query}"`);

    // Пробуем семантический поиск
    let semanticResults: SavedContentDto[] | null = null;
    try {
      const embedding = await this.embeddingService.generateForQuery(query);
      semanticResults = await this.contentService.semanticSearch(
        user.id,
        embedding,
        SEARCH_PAGE_SIZE,
      );
    } catch (err) {
      this.logger.warn(`semantic search failed, fallback to text: ${err}`);
    }

    if (semanticResults !== null) {
      if (semanticResults.length === 0) {
        await ctx.reply(
          `Ничего не нашлось по запросу «<b>${this.escapeHtml(query)}</b>».`,
          { parse_mode: 'HTML' },
        );
        return;
      }

      this.pendingSearches.delete(telegramId);
      const { text, keyboard } = this.formatSearchResults(
        semanticResults,
        false,
        query,
      );
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true },
      });
      return;
    }

    // Fallback — текстовый поиск
    const result = await this.contentService.getContentWithPagination(user.id, {
      search: query,
      limit: SEARCH_PAGE_SIZE,
    });

    if (result.data.length === 0) {
      await ctx.reply(
        `Ничего не нашлось по запросу «<b>${this.escapeHtml(query)}</b>».`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    if (result.pagination.hasMore && result.pagination.nextCursor) {
      this.pendingSearches.set(telegramId, {
        query,
        nextCursor: result.pagination.nextCursor,
      });
    } else {
      this.pendingSearches.delete(telegramId);
    }

    const { text, keyboard } = this.formatSearchResults(
      result.data,
      result.pagination.hasMore,
      query,
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  async handleSearchMore(ctx: Context) {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const pending = this.pendingSearches.get(telegramId);
    if (!pending) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      return;
    }

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return;

    const result = await this.contentService.getContentWithPagination(user.id, {
      search: pending.query,
      limit: SEARCH_PAGE_SIZE,
      cursor: pending.nextCursor,
    });

    // Remove "Ещё" button from previous message
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    if (result.data.length === 0) {
      await ctx.reply('Больше результатов нет.');
      this.pendingSearches.delete(telegramId);
      return;
    }

    if (result.pagination.hasMore && result.pagination.nextCursor) {
      this.pendingSearches.set(telegramId, {
        query: pending.query,
        nextCursor: result.pagination.nextCursor,
      });
    } else {
      this.pendingSearches.delete(telegramId);
    }

    const { text, keyboard } = this.formatSearchResults(
      result.data,
      result.pagination.hasMore,
      pending.query,
      true,
    );
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  }

  // ─── Приватные методы ─────────────────────────────────────────────────────

  private async handleUrl(ctx: Context, telegramId: number, url: string) {
    const from = ctx.from!;
    const user = await this.usersService.findOrCreateByTelegramId(
      telegramId,
      from.first_name,
    );

    this.logger.log(`saving url userId=${user.id} url=${url}`);
    try {
      await ctx.deleteMessage(ctx.message!.message_id);
    } catch {
      // not critical
    }
    const loadingMsg = await ctx.reply('Сохраняю...');

    let preview: PreviewDto;
    try {
      preview = await this.previewLinkService.getPreview(url);
    } catch {
      await ctx.deleteMessage(loadingMsg.message_id);
      await ctx.reply(
        'Не удалось получить информацию по ссылке. Попробуй ещё раз.',
      );
      return;
    }

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url;
    }

    const saved = await this.contentService.create(
      {
        title: preview.title ?? url,
        url,
        domain: hostname,
        description: preview.description ?? undefined,
        image: preview.image ?? undefined,
        favicon: preview.favicon ?? undefined,
        siteName: preview.siteName ?? undefined,
        type: preview.type ?? undefined,
      },
      user.id,
    );

    this.logger.log(`url saved contentId=${saved.id} userId=${user.id}`);
    await ctx.deleteMessage(loadingMsg.message_id);
    await this.sendContentCard(ctx, saved);

    this.generateAndStoreEmbedding(
      saved.id,
      saved.title ?? url,
      saved.description,
      saved.siteName,
    ).catch(() => {});
  }

  private async sendContentCard(ctx: Context, content: SavedContentDto) {
    const title = this.truncate(content.title ?? 'Без названия', 100);
    const description = content.description
      ? this.truncate(content.description, 200)
      : null;
    const domain = content.domain;

    const lines = [`<b>${this.escapeHtml(title)}</b>`];
    if (description) lines.push(this.escapeHtml(description));
    if (domain) lines.push(`🌐 ${this.escapeHtml(domain)}`);
    const caption = lines.join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📁 В папку',
            callback_data: `folder_menu:${content.id}`,
          },
          {
            text: '🗑 Удалить',
            callback_data: `delete_content:${content.id}`,
          },
        ],
      ],
    };

    const imageUrl = content.image?.url;
    if (imageUrl) {
      try {
        await ctx.replyWithPhoto(imageUrl, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        return;
      } catch {
        // Fall through to text reply
      }
    }

    await ctx.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  private formatContentList(
    items: SavedContentDto[],
    header: string,
    hasMore = false,
    callbacks: { more?: string; back?: string } = { more: 'all_more' },
  ): { text: string; keyboard: InlineKeyboardMarkup } {
    const lines = items.map((item, i) => {
      const title = this.truncate(item.title ?? 'Без названия', 80);
      const titlePart = item.url
        ? `<a href="${item.url}">${this.escapeHtml(title)}</a>`
        : `<b>${this.escapeHtml(title)}</b>`;
      const description = item.description
        ? `\n   ${this.truncate(this.escapeHtml(item.description), 120)}`
        : '';
      return `${i + 1}. ${titlePart}${description}`;
    });

    const text = [header, ...lines].join('\n\n');

    const rows: InlineKeyboardMarkup['inline_keyboard'] = [];
    const navRow: { text: string; callback_data: string }[] = [];
    if (callbacks.back) navRow.push({ text: '← Назад', callback_data: callbacks.back });
    if (hasMore && callbacks.more) navRow.push({ text: '→ Ещё', callback_data: callbacks.more });
    if (navRow.length) rows.push(navRow);

    return { text, keyboard: { inline_keyboard: rows } };
  }

  private formatSearchResults(
    items: SavedContentDto[],
    hasMore: boolean,
    query: string,
    isContinuation = false,
  ): { text: string; keyboard: InlineKeyboardMarkup } {
    const header = isContinuation
      ? `🔎 Ещё по «<b>${this.escapeHtml(query)}</b>»:`
      : `🔎 По «<b>${this.escapeHtml(query)}</b>»:`;

    const lines = items.map((item, i) => {
      const title = this.truncate(item.title ?? 'Без названия', 80);
      const titlePart = item.url
        ? `<a href="${item.url}">${this.escapeHtml(title)}</a>`
        : `<b>${this.escapeHtml(title)}</b>`;
      const description = item.description
        ? `\n   ${this.truncate(this.escapeHtml(item.description), 120)}`
        : '';
      return `${i + 1}. ${titlePart}${description}`;
    });

    const text = [header, ...lines].join('\n\n');

    const rows: InlineKeyboardMarkup['inline_keyboard'] = [];
    if (hasMore) {
      rows.push([{ text: '→ Ещё результаты', callback_data: 'search_more' }]);
    }

    return { text, keyboard: { inline_keyboard: rows } };
  }

  private async sendFolderBrowsePage(
    ctx: Context,
    folders: FolderDto[],
    page: number,
    mode: 'reply' | 'edit',
  ) {
    const start = page * FOLDERS_PAGE_SIZE;
    const pageFolders = folders.slice(start, start + FOLDERS_PAGE_SIZE);

    if (pageFolders.length === 0 && page === 0) {
      const text = 'У тебя пока нет папок. Создай первую:';
      const keyboard = {
        inline_keyboard: [[{ text: '➕ Новая папка', callback_data: 'folder_new' }]],
      };
      if (mode === 'edit') {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      } else {
        await ctx.reply(text, { reply_markup: keyboard });
      }
      return;
    }

    const folderButtons = pageFolders.map((f) => [
      { text: f.title ?? 'Без названия', callback_data: `browse_folder:${f.id}` },
    ]);

    const nav: { text: string; callback_data: string }[] = [];
    if (page > 0) nav.push({ text: '← Назад', callback_data: `browse_folder_list:${page - 1}` });
    if (start + FOLDERS_PAGE_SIZE < folders.length) nav.push({ text: 'Вперёд →', callback_data: `browse_folder_list:${page + 1}` });

    const rows = [...folderButtons];
    if (nav.length) rows.push(nav);

    const keyboard = { inline_keyboard: rows };
    const text = '📁 Выбери папку:';

    if (mode === 'edit') {
      await ctx.editMessageText(text, { reply_markup: keyboard });
    } else {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  }

  private async sendFolderPage(
    ctx: Context,
    folders: FolderDto[],
    page: number,
    mode: 'reply' | 'edit',
  ) {
    const start = page * FOLDERS_PAGE_SIZE;
    const pageFolders = folders.slice(start, start + FOLDERS_PAGE_SIZE);

    if (pageFolders.length === 0 && page === 0) {
      const text = 'У тебя пока нет папок. Создай первую:';
      const keyboard = {
        inline_keyboard: [
          [
            { text: '➕ Новая папка', callback_data: 'folder_new' },
            { text: '❌ Отмена', callback_data: 'folder_cancel' },
          ],
        ],
      };
      if (mode === 'edit') {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      } else {
        await ctx.reply(text, { reply_markup: keyboard });
      }
      return;
    }

    const folderButtons = pageFolders.map((f) => [
      {
        text: f.title ?? 'Без названия',
        callback_data: `pick_folder:${f.id}`,
      },
    ]);

    const nav: { text: string; callback_data: string }[] = [];
    if (page > 0) {
      nav.push({ text: '← Назад', callback_data: `folder_page:${page - 1}` });
    }
    if (start + FOLDERS_PAGE_SIZE < folders.length) {
      nav.push({
        text: 'Вперёд →',
        callback_data: `folder_page:${page + 1}`,
      });
    }

    const rows = [...folderButtons];
    if (nav.length) rows.push(nav);
    rows.push([
      { text: '➕ Новая папка', callback_data: 'folder_new' },
      { text: '❌ Отмена', callback_data: 'folder_cancel' },
    ]);

    const keyboard = { inline_keyboard: rows };
    const text = '📁 Выбери папку:';

    if (mode === 'edit') {
      const msg = ctx.callbackQuery?.message;
      const hasMedia = msg && ('photo' in msg || 'document' in msg || 'video' in msg || 'sticker' in msg || 'animation' in msg);
      if (hasMedia) {
        await ctx.editMessageCaption(text, { reply_markup: keyboard });
      } else {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      }
    } else {
      await ctx.reply(text, { reply_markup: keyboard });
    }
  }

  private async handleFolderNameInput(
    ctx: Context,
    telegramId: number,
    name: string,
    contentId: string | undefined,
  ) {
    const trimmed = name.trim();
    if (!trimmed) {
      await ctx.reply('Название не может быть пустым. Попробуй ещё раз.');
      return;
    }

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      await ctx.reply('Пользователь не найден. Нажми /start.');
      this.states.delete(telegramId);
      return;
    }

    const dto: CreateFolderDto = { title: trimmed, description: '' };
    const folder = await this.foldersService.create(dto, user.id);
    this.states.delete(telegramId);

    if (contentId) {
      try {
        await this.contentService.addToFolder(
          contentId,
          { folderId: folder.id },
          user.id,
        );
        this.pendingFolderSelections.delete(telegramId);
        await ctx.reply(
          `Папка «${folder.title}» создана и ссылка сохранена в неё.`,
        );
      } catch {
        await ctx.reply(
          `Папка «${folder.title}» создана, но добавить ссылку не удалось.`,
        );
      }
    } else {
      await ctx.reply(`Папка «${folder.title}» создана.`);
    }
  }

  private async handleEmailInput(
    ctx: Context,
    telegramId: number,
    email: string,
    action: 'link' | 'register',
  ) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ctx.reply('Это не похоже на email. Попробуй ещё раз.');
      return;
    }

    try {
      await ctx.deleteMessage(ctx.message!.message_id);
    } catch {
      // Can't delete — not critical
    }

    const user = await this.usersService.findByEmail(email);

    if (action === 'link' && !user) {
      await ctx.reply(
        'Аккаунт с таким email не найден. Проверь email или нажми /start чтобы начать заново.',
      );
      this.states.delete(telegramId);
      return;
    }

    if (user?.telegramId) {
      await ctx.reply(
        'Этот аккаунт уже привязан к другому Telegram. Нажми /start чтобы начать заново.',
      );
      this.states.delete(telegramId);
      return;
    }

    const code = this.generateCode();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 3);

    if (user) {
      await this.usersService.setVerificationCode(user.id, code, expiry);
    }

    await this.mailService.sendVerificationEmail(
      email,
      user?.firstName ?? 'друг',
      code,
    );

    this.states.set(telegramId, {
      step: 'awaiting_code',
      action,
      email,
    });

    await ctx.reply(
      `Отправил код на ${email}. Введи 6-значный код из письма.\n` +
        `Код действует 3 минуты.`,
    );
  }

  private async handleCodeInput(
    ctx: Context,
    telegramId: number,
    code: string,
    email: string,
  ) {
    if (!/^\d{6}$/.test(code)) {
      await ctx.reply('Код должен состоять из 6 цифр. Попробуй ещё раз.');
      return;
    }

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      await ctx.reply('Что-то пошло не так. Нажми /start чтобы начать заново.');
      this.states.delete(telegramId);
      return;
    }

    if (
      user.emailVerificationToken !== code ||
      !user.emailVerificationTokenExpiry ||
      user.emailVerificationTokenExpiry < new Date()
    ) {
      await ctx.reply(
        'Неверный или просроченный код. Попробуй ещё раз или нажми /start.',
      );
      return;
    }

    await this.usersService.clearVerificationAndLink(user.id, telegramId);
    this.states.delete(telegramId);

    this.logger.log(`Telegram ${telegramId} linked to user ${user.id}`);

    await ctx.reply(
      `Готово! Аккаунт привязан, ${user.firstName}. ` +
        `Теперь кидай ссылку — я её сохраню.`,
      { reply_markup: MAIN_KEYBOARD },
    );
  }

  private async generateAndStoreEmbedding(
    contentId: string,
    title: string,
    description?: string | null,
    siteName?: string | null,
  ): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateForContent(
        title,
        description,
        siteName,
      );
      await this.contentService.updateEmbedding(contentId, embedding);
      this.logger.log(`embedding saved for contentId=${contentId}`);
    } catch (err) {
      this.logger.warn(`failed to generate embedding for ${contentId}: ${err}`);
    }
  }

  private isUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '…';
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
