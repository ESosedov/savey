import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SimilarContent } from '../entities/similar-content.entity';
import { Repository } from 'typeorm';
import { Content } from '../entities/content.entity';
import { ContentService } from '../content.service';
import { SimilarContentCreateDto } from '../dto/similar-content/similar-content-create.dto';
import { SimilarContentDto } from '../dto/similar-content/similar-content.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SimilarContentService {
  constructor(
    @InjectRepository(SimilarContent)
    private readonly similarContentRepository: Repository<SimilarContent>,
    private readonly contentService: ContentService,
  ) {}

  async addSimilar(
    contentId: string,
    userId: string,
    similarContents: SimilarContentCreateDto[],
  ): Promise<SimilarContentDto[]> {
    const content: Content = await this.contentService.findById(
      contentId,
      userId,
    );

    await this.similarContentRepository.delete({ content });
    const newSimilar = similarContents.map((dto) =>
      this.similarContentRepository.create({ content, ...dto }),
    );
    await this.similarContentRepository.save(newSimilar);

    return plainToInstance(SimilarContentDto, newSimilar, {
      excludeExtraneousValues: true,
    });
  }

  async getSimilar(
    contentId: string,
    userId: string,
  ): Promise<SimilarContentDto[]> {
    const content: Content = await this.contentService.findById(
      contentId,
      userId,
    );

    const similarContent = await this.similarContentRepository.find({
      where: { content: { id: content.id } },
    });

    return plainToInstance(SimilarContentDto, similarContent, {
      excludeExtraneousValues: true,
    });
  }
}
