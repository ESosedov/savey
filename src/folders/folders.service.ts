import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from './entities/folder.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { plainToInstance } from 'class-transformer';
import { FolderDto } from './dto/folder.dto';
import { FolderFilterDto } from './dto/folder-filter.dto';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {}

  async create(
    createFolderDto: CreateFolderDto,
    userId: string,
  ): Promise<FolderDto> {
    const folder = this.folderRepository.create({
      ...createFolderDto,
      userId: userId,
    });
    const savedFolder = await this.folderRepository.save(folder);

    return plainToInstance(FolderDto, savedFolder, {
      excludeExtraneousValues: true,
    });
  }

  // async update(
  //   id: string,
  //   updateFolderDto: UpdateFolderDto,
  //   userId: string,
  // ): Promise<Folder> {
  //   const folder = await this.folderRepository.findOne({ where: { id } });
  //
  //   if (!folder) {
  //     throw new NotFoundException(`Folder with ID ${id} not found`);
  //   }
  //
  //   if (folder.userId !== userId) {
  //     throw new ForbiddenException('You can only edit your own folders');
  //   }
  //
  //   Object.assign(folder, updateFolderDto);
  //   return await this.folderRepository.save(folder);
  // }

  async findOne(id: string, userId?: string): Promise<FolderDto | null> {
    const result = await this.folderRepository
      .createQueryBuilder('folder')
      .leftJoinAndSelect(
        'folder.content',
        'content',
        `content.image IS NOT NULL AND content.id IN (
        SELECT c2.id FROM content c2 
        WHERE c2.folder_id = folder.id 
        AND c2.image IS NOT NULL
        ORDER BY c2.created_at DESC 
        LIMIT 7
      )`,
      )
      .where('folder.id = :id', { id })
      .andWhere('folder.userId = :userId', { userId })
      .getOne();

    if (!result) {
      return null;
    }

    return plainToInstance(
      FolderDto,
      {
        id: result.id,
        title: result.title,
        description: result.description,
        isPublic: result.isPublic,
        images: result.content?.map((c) => c.image?.url).filter(Boolean) || [],
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async getList(
    filters: FolderFilterDto,
    userId: string,
  ): Promise<FolderDto[]> {
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const foldersWithImages = await this.findAllFoldersWithRecentImages(
      userId,
      filters.search,
      limit,
      offset,
    );

    return foldersWithImages.map((folder) =>
      plainToInstance(FolderDto, folder, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const folder = await this.findById(id, userId);

    await this.folderRepository.remove(folder);
  }

  async findById(id: string, userId?: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    if (!folder.isPublic && folder.userId !== userId) {
      throw new ForbiddenException('Access denied to this folder');
    }

    return folder;
  }

  private async findAllFoldersWithRecentImages(
    userId: string,
    title?: string,
    limit?: number,
    offset?: number,
  ): Promise<any[]> {
    const query = `
    SELECT 
      f.id,
      f.title,
      f.description,
      f.is_public,
      COALESCE(
        json_agg(recent_content.image_url ORDER BY recent_content.created_at DESC) 
        FILTER (WHERE recent_content.image_url IS NOT NULL),
        '[]'
      ) as "images"
    FROM folders f
    LEFT JOIN LATERAL (
      SELECT 
        c.image->>'url' as image_url,
        c."created_at" as created_at
      FROM content c 
      WHERE c."folder_id" = f.id AND c.image IS NOT NULL
      ORDER BY c."created_at" DESC
      LIMIT 7
    ) recent_content ON true
    WHERE f."user_id" = $1
    ${title ? 'AND LOWER(f.title) LIKE $2' : ''}
    GROUP BY f.id, f.title, f.description, f."is_public", f."created_at", f."updated_at"
    ORDER BY f."created_at" DESC
    ${limit ? `LIMIT $${title ? '3' : '2'}` : ''}
    ${offset ? `OFFSET $${title ? (limit ? '4' : '3') : limit ? '3' : '2'}` : ''}
  `;

    const params: any[] = [userId];

    if (title) {
      params.push(`%${title.toLowerCase()}%`);
    }

    if (limit) {
      params.push(limit);
    }

    if (offset) {
      params.push(offset);
    }

    return await this.folderRepository.query(query, params);
  }
}
