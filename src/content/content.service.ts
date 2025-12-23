import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Content } from './entities/content.entity';
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

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly folderService: FoldersService,
    private readonly cursorService: CursorService,
    @InjectRepository(SimilarContent)
    private readonly similarContentRepository: Repository<SimilarContent>,
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
  ): Promise<ContentDto> {
    const content = await this.findOwned(id, userId, ['folders']);

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

  async getOne(id: string, userId: string): Promise<ContentDto> {
    const content = await this.findPublicOrOwned(id, userId);
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

  async remove(id: string, userId: string): Promise<void> {
    const content = await this.findOwned(id, userId);

    await this.contentRepository.remove(content);
  }

  async addToFolder(
    id: string,
    addToFolderDto: AddToFolderDto,
    userId: string,
  ): Promise<ContentDto> {
    const content = await this.findOwned(id, userId, ['folders']);

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
  ): Promise<ContentDto> {
    const content = await this.findOwned(id, userId, ['folders']);

    await this.folderService.findById(folderId, userId);

    content.folders = content.folders.filter((f) => f.id !== folderId);
    await this.contentRepository.save(content);

    return plainToInstance(ContentDto, content, {
      excludeExtraneousValues: true,
    });
  }

  public async findOwned(
    id: string,
    userId: string,
    relations: string[] = ['user'],
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

    return content;
  }

  async findPublicOrOwned(id: string, userId: string): Promise<Content> {
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

    return content;
  }
}
