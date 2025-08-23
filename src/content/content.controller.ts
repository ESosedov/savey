import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  async create(
    @GetUser() user: User,
    @Body(ValidationPipe)
    createContentDto: CreateContentDto,
  ) {
    // TODO: Add validation for folder ownership
    return this.contentService.create(createContentDto, user.id);
  }

  @Get('search')
  async search(@GetUser() user: User, @Query('q') query: string) {
    return this.contentService.search(query, user.id);
  }

  @Get(':id')
  async findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findOne(id, user.id);
  }

  @Patch(':id')
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateContentDto: UpdateContentDto,
  ) {
    return this.contentService.update(id, updateContentDto, user.id);
  }

  @Delete(':id')
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id, user.id);
  }
}
