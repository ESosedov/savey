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

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {}

  async create(
    createFolderDto: CreateFolderDto,
    userId: string,
  ): Promise<Folder> {
    const folder = this.folderRepository.create({
      ...createFolderDto,
      userId: userId,
    });
    return await this.folderRepository.save(folder);
  }

  async update(
    id: string,
    updateFolderDto: UpdateFolderDto,
    userId: string,
  ): Promise<Folder> {
    const folder = await this.folderRepository.findOne({ where: { id } });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    if (folder.userId !== userId) {
      throw new ForbiddenException('You can only edit your own folders');
    }

    Object.assign(folder, updateFolderDto);
    return await this.folderRepository.save(folder);
  }

  async findByUser(userId: string): Promise<Folder[]> {
    return await this.folderRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId?: string): Promise<Folder> {
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

  async remove(id: string, userId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({ where: { id } });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    if (folder.userId !== userId) {
      throw new ForbiddenException('You can only delete your own folders');
    }

    await this.folderRepository.remove(folder);
  }

  async search(query: string, userId: string): Promise<Folder[]> {
    const queryBuilder = this.folderRepository
      .createQueryBuilder('folder')
      .leftJoinAndSelect('folder.user', 'user')
      .where('folder.title ILIKE :query', { query: `%${query}%` });

    if (userId) {
      queryBuilder.andWhere(
        '(folder.isPublic = :isPublic OR folder.userId = :userId)',
        {
          isPublic: true,
          userId: userId,
        },
      );
    } else {
      queryBuilder.andWhere('folder.isPublic = :isPublic', { isPublic: true });
    }

    return queryBuilder.orderBy('folder.createdAt', 'DESC').getMany();
  }
}
