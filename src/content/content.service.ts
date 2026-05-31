import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
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
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';

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

    return plainToInstance(ContentDto, savedContent, {
      excludeExtraneousValues: true,
    });
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
      .limit(limit);

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
  ): Promise<ContentDto[]> {
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await this.dataSource.query(
      `SELECT id, title, url, domain, description, type, favicon,
              site_name AS "siteName",
              image,
              content_type AS "contentType",
              mime_type AS "mimeType",
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              user_id AS "userId"
       FROM content
       WHERE user_id = $2 AND embedding IS NOT NULL
         AND embedding <=> $1::vector < 0.35
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorStr, userId, limit],
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
}
