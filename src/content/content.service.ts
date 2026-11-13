import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Content, ContentType } from './entities/content.entity';
import { ContentCreateDto } from './dto/content-create.dto';
import { ContentFilterDto } from './dto/content-filter.dto';
import { CursorService } from './services/cursor.service';
import { ContentDto } from './dto/content.dto';
import { plainToInstance } from 'class-transformer';
import { AddToFolderDto } from './dto/add-to-folder.dto';
import { FoldersService } from '../folders/folders.service';
import { UpdateContentDto } from './dto/update-content.dto';
import { SimilarContent } from './entities/similar-content.entity';
import { Folder } from '../folders/entities/folder.entity';
import {
  StorageService,
  STORAGE_LIMIT_BYTES,
} from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly folderService: FoldersService,
    private readonly cursorService: CursorService,
    @InjectRepository(SimilarContent)
    private readonly similarContentRepository: Repository<SimilarContent>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createContentDto: ContentCreateDto,
    userId: string,
  ): Promise<ContentDto> {
    const { folderIds, ...contentData } = createContentDto;

    const content = this.contentRepository.create({
      ...contentData,
      userId: userId,
    });

    // Если указаны папки, загружаем их одним запросом
    if (folderIds && folderIds.length > 0) {
      const folders = await this.folderRepository.find({
        where: {
          id: In(folderIds),
          userId: userId,
        },
      });

      if (folders.length !== folderIds.length) {
        throw new NotFoundException('Some folders not found or access denied');
      }

      content.folders = folders;
    }

    const savedContent = await this.contentRepository.save(content);

    if (savedContent.title && savedContent.contentType !== ContentType.PHOTO) {
      this.generateAndStoreEmbedding(
        savedContent.id,
        savedContent.title,
        savedContent.description,
      ).catch(() => {});
    }

    return plainToInstance(ContentDto, savedContent, {
      excludeExtraneousValues: true,
    });
  }

  async createPhoto(
    userId: string,
    buffer: Buffer,
    mimeType: string,
    title?: string,
    description?: string,
  ): Promise<ContentDto> {
    const user = await this.usersService.findOne(userId);
    if (Number(user.storageUsed) + buffer.length > STORAGE_LIMIT_BYTES) {
      throw new PayloadTooLargeException('Storage limit exceeded');
    }

    const rawDomain = this.configService.get<string>('PUBLIC_DOMAIN') ?? '';
    const baseUrl = rawDomain.startsWith('http')
      ? rawDomain
      : `https://${rawDomain}`;

    let fileKey: string | undefined;
    let thumbnailKey: string | undefined;
    try {
      const [{ key: uploadedKey }, thumbnail] = await Promise.all([
        this.storageService.uploadFile(buffer, mimeType, 'photos'),
        this.storageService.uploadImage(buffer),
      ]);
      fileKey = uploadedKey;
      thumbnailKey = `${thumbnail.id}.webp`;

      const savedContent = await this.create(
        {
          title: title || `Фото ${new Date().toLocaleDateString('ru')}`,
          description: description || undefined,
          contentType: ContentType.PHOTO,
          fileKey,
          fileSize: buffer.length,
          mimeType,
          image: {
            url: `${baseUrl}/images/${thumbnail.id}.webp`,
            width: thumbnail.width,
            height: thumbnail.height,
          },
        },
        userId,
      );

      await this.usersService.incrementStorageUsed(userId, buffer.length);

      this.generateAndStoreImageEmbedding(
        savedContent.id,
        buffer,
        mimeType,
      ).catch(() => {});

      return savedContent;
    } catch (err) {
      if (fileKey)
        await this.storageService.deleteFile(fileKey).catch(() => {});
      if (thumbnailKey)
        await this.storageService.deleteFile(thumbnailKey).catch(() => {});
      throw err;
    }
  }

  async getContentWithPagination(
    userId: string,
    filters: ContentFilterDto,
    contentTypes?: string[],
  ): Promise<{
    data: ContentDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    const { cursor, limit = 20, search, folderId } = filters;

    let queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.folders', 'folders')
      .orderBy('content.createdAt', 'DESC')
      .addOrderBy('content.id', 'DESC')
      .take(limit);

    if (contentTypes && contentTypes.length > 0) {
      queryBuilder = queryBuilder.andWhere(
        'content.contentType IN (:...contentTypes)',
        { contentTypes },
      );
    }

    if (folderId) {
      queryBuilder = queryBuilder
        .andWhere('folders.id = :folderId', { folderId })
        .andWhere(
          '(content.userId = :userId OR folders.isPublic = :isPublic)',
          {
            userId,
            isPublic: true,
          },
        );
    } else {
      queryBuilder = queryBuilder.andWhere('(content.userId = :userId)', {
        userId,
      });
    }

    if (search) {
      const searchTerm = search.toLowerCase();

      queryBuilder = queryBuilder.andWhere(
        'LOWER(content.title) LIKE :search',
        {
          search: `%${searchTerm}%`,
        },
      );
    }

    if (cursor) {
      const { createdAt, id } = this.cursorService.decode(cursor);
      queryBuilder = queryBuilder.andWhere(
        '(content.createdAt, content.id) < (:createdAt, :id)',
        { createdAt, id },
      );
    }

    const items = await queryBuilder.getMany();

    let nextCursor: string | null = null;
    if (items.length === limit) {
      const lastItem = items[items.length - 1];
      nextCursor = this.cursorService.encode(lastItem.createdAt, lastItem.id);
    }

    return {
      data: plainToInstance(ContentDto, items, {
        excludeExtraneousValues: true,
      }),
      pagination: {
        nextCursor,
        hasMore: items.length === limit,
      },
    };
  }

  async update(
    id: string,
    updateContentDto: UpdateContentDto,
    userId: string,
    allowedContentTypes?: string[],
  ): Promise<ContentDto> {
    const content = await this.findOwned(
      id,
      userId,
      ['folders'],
      allowedContentTypes,
    );

    const { folderIds, ...contentData } = updateContentDto;
    Object.assign(content, contentData);

    // Если указаны папки, обновляем связи одним запросом
    if (folderIds !== undefined) {
      if (folderIds.length > 0) {
        const folders = await this.folderRepository.find({
          where: {
            id: In(folderIds),
            userId: userId,
          },
        });

        if (folders.length !== folderIds.length) {
          throw new NotFoundException(
            'Some folders not found or access denied',
          );
        }

        content.folders = folders;
      } else {
        // Если пустой массив - удаляем все связи с папками
        content.folders = [];
      }
    }

    const updateContent = await this.contentRepository.save(content);

    return plainToInstance(ContentDto, updateContent, {
      excludeExtraneousValues: true,
    });
  }

  async getOne(
    id: string,
    userId: string,
    allowedContentTypes?: string[],
  ): Promise<ContentDto> {
    const content = await this.findPublicOrOwned(
      id,
      userId,
      allowedContentTypes,
    );
    const similar = await this.similarContentRepository.find({
      where: { content: { id: content.id } },
    });

    return plainToInstance(
      ContentDto,
      { ...content, similar },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async remove(
    id: string,
    userId: string,
    allowedContentTypes?: string[],
  ): Promise<void> {
    const content = await this.findOwned(
      id,
      userId,
      ['user'],
      allowedContentTypes,
    );

    await this.contentRepository.remove(content);

    if (content.fileKey && content.fileSize) {
      try {
        await this.storageService.deleteFile(content.fileKey);
        await this.usersService.decrementStorageUsed(
          userId,
          Number(content.fileSize),
        );
      } catch (err) {
        this.logger.warn(`failed to delete file ${content.fileKey}: ${err}`);
      }
    }
  }

  async addToFolder(
    id: string,
    addToFolderDto: AddToFolderDto,
    userId: string,
    allowedContentTypes?: string[],
  ): Promise<ContentDto> {
    const content = await this.findOwned(
      id,
      userId,
      ['folders'],
      allowedContentTypes,
    );

    const folder = await this.folderService.findById(
      addToFolderDto.folderId,
      userId,
    );

    // Check if folder is already added
    if (!content.folders.some((f) => f.id === folder.id)) {
      content.folders.push(folder);
      await this.contentRepository.save(content);
    }

    return plainToInstance(ContentDto, content, {
      excludeExtraneousValues: true,
    });
  }

  async removeFromFolder(
    id: string,
    folderId: string,
    userId: string,
    allowedContentTypes?: string[],
  ): Promise<ContentDto> {
    const content = await this.findOwned(
      id,
      userId,
      ['folders'],
      allowedContentTypes,
    );

    await this.folderService.findById(folderId, userId);

    content.folders = content.folders.filter((f) => f.id !== folderId);
    await this.contentRepository.save(content);

    return plainToInstance(ContentDto, content, {
      excludeExtraneousValues: true,
    });
  }

  async search(
    userId: string,
    query: string,
    limit: number,
    contentTypes?: string[],
  ): Promise<ContentDto[]> {
    try {
      const embedding = await this.embeddingService.generateForQuery(query);
      const results = await this.semanticSearch(
        userId,
        embedding,
        limit,
        contentTypes,
      );
      if (results.length > 0) return results;
    } catch (err) {
      this.logger.warn(`semantic search failed, fallback to text: ${err}`);
    }

    const searchTerm = query.toLowerCase();
    let qb = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.folders', 'folders')
      .where('content.userId = :userId', { userId })
      .andWhere('LOWER(content.title) LIKE :search', {
        search: `%${searchTerm}%`,
      })
      .orderBy('content.createdAt', 'DESC')
      .take(limit);

    if (contentTypes && contentTypes.length > 0) {
      qb = qb.andWhere('content.contentType IN (:...contentTypes)', {
        contentTypes,
      });
    }

    const items = await qb.getMany();
    return plainToInstance(ContentDto, items, {
      excludeExtraneousValues: true,
    });
  }

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`;
    await this.dataSource.query(
      `UPDATE content SET embedding = $1::vector WHERE id = $2`,
      [vectorStr, id],
    );
  }

  async semanticSearch(
    userId: string,
    embedding: number[],
    limit: number,
    contentTypes?: string[],
  ): Promise<ContentDto[]> {
    const vectorStr = `[${embedding.join(',')}]`;
    const params: unknown[] = [vectorStr, userId, limit];
    let typeFilter = '';
    if (contentTypes && contentTypes.length > 0) {
      params.push(contentTypes);
      typeFilter = `AND c.content_type = ANY($${params.length})`;
    }
    const rows = await this.dataSource.query(
      `SELECT c.id, c.title, c.url, c.domain, c.description, c.type, c.favicon,
              c.site_name AS "siteName",
              c.image,
              c.content_type AS "contentType",
              c.mime_type AS "mimeType",
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt",
              c.user_id AS "userId",
              COALESCE(
                json_agg(json_build_object('id', cf."folderId"))
                  FILTER (WHERE cf."folderId" IS NOT NULL),
                '[]'
              ) AS folders
       FROM content c
       LEFT JOIN content_folders cf ON cf."contentId" = c.id
       WHERE c.user_id = $2 AND c.embedding IS NOT NULL
         AND c.embedding <=> $1::vector < 0.35
         ${typeFilter}
       GROUP BY c.id
       ORDER BY c.embedding <=> $1::vector
       LIMIT $3`,
      params,
    );
    return plainToInstance(ContentDto, rows as object[], {
      excludeExtraneousValues: true,
    });
  }

  public async findOwned(
    id: string,
    userId: string,
    relations: string[] = ['user'],
    allowedContentTypes?: string[],
  ): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations,
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (content.userId !== userId) {
      throw new ForbiddenException('Access denied to this content');
    }

    if (
      allowedContentTypes &&
      allowedContentTypes.length > 0 &&
      !allowedContentTypes.includes(content.contentType ?? ContentType.LINK)
    ) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    return content;
  }

  async findPublicOrOwned(
    id: string,
    userId: string,
    allowedContentTypes?: string[],
  ): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['user', 'folders'],
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    const isPublicFolder = content.folders.some((folder) => folder.isPublic);

    if (content.userId !== userId && !isPublicFolder) {
      throw new ForbiddenException('Access denied to this content');
    }

    if (
      allowedContentTypes &&
      allowedContentTypes.length > 0 &&
      !allowedContentTypes.includes(content.contentType ?? ContentType.LINK)
    ) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    return content;
  }

  private async generateAndStoreEmbedding(
    contentId: string,
    title: string,
    description?: string | null,
  ): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateForContent(
        title,
        description,
      );
      await this.updateEmbedding(contentId, embedding);
      this.logger.log(`embedding saved for contentId=${contentId}`);
    } catch (err) {
      this.logger.warn(`failed to generate embedding for ${contentId}: ${err}`);
    }
  }

  private async generateAndStoreImageEmbedding(
    contentId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateFromImage(
        buffer,
        mimeType,
      );
      await this.updateEmbedding(contentId, embedding);
      this.logger.log(`image embedding saved for contentId=${contentId}`);
    } catch (err) {
      this.logger.warn(
        `failed to generate image embedding for ${contentId}: ${err}`,
      );
    }
  }
}
