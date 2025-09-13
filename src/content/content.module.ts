import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Content } from './entities/content.entity';
import { CursorService } from './services/cursor.service';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [TypeOrmModule.forFeature([Content]), FoldersModule],
  controllers: [ContentController],
  providers: [ContentService, CursorService],
  exports: [ContentService],
})
export class ContentModule {}
