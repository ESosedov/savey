import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { UpdateContentDto } from './dto/update-content.dto';
import { Content } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {}

  async create(
    createContentDto: CreateContentDto,
    userId: string,
  ): Promise<Content> {
    const content = this.contentRepository.create({
      ...createContentDto,
      userId: userId,
    });
    return await this.contentRepository.save(content);
  }

  // async update(
  //   id: string,
  //   updateContentDto: UpdateContentDto,
  //   userId: string,
  // ): Promise<Content> {
  //   const content = await this.contentRepository.findOne({ where: { id } });
  //
  //   if (!content) {
  //     throw new NotFoundException(`Content with ID ${id} not found`);
  //   }
  //
  //   if (content.userId !== userId) {
  //     throw new ForbiddenException('You can only edit your own content');
  //   }
  //
  //   Object.assign(content, updateContentDto);
  //   return await this.contentRepository.save(content);
  // }

  async findOne(id: string, userId: string): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (content.userId !== userId) {
      throw new ForbiddenException('Access denied to this content');
    }

    return content;
  }

  async remove(id: string, userId: string): Promise<void> {
    const content = await this.contentRepository.findOne({ where: { id } });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    if (content.userId !== userId) {
      throw new ForbiddenException('You can only delete your own content');
    }

    await this.contentRepository.remove(content);
  }

  async search(query: string, userId?: string): Promise<Content[]> {
    const queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.user', 'user')
      .where('content.title ILIKE :query', { query: `%${query}%` })
      .andWhere('(content.userId = :userId)', {
        userId: userId,
      });

    return queryBuilder.orderBy('content.createdAt', 'DESC').getMany();
  }
}
