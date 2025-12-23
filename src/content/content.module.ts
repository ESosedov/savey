import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Content } from './entities/content.entity';
import { CursorService } from './services/cursor.service';
import { FoldersModule } from '../folders/folders.module';
import { SimilarContentService } from './services/similar-content.service';
import { SimilarContent } from './entities/similar-content.entity';
import { Folder } from '../folders/entities/folder.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, SimilarContent, Folder]),
    FoldersModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, CursorService, SimilarContentService],
  exports: [ContentService],
})
export class ContentModule {}
