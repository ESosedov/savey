import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ValidationPipe,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { ContentService } from './content.service';
import { ContentCreateDto } from './dto/content-create.dto';
import { ContentFilterDto } from './dto/content-filter.dto';
import { ContentDto } from './dto/content.dto';
import { AddToFolderDto } from './dto/add-to-folder.dto';
// import { UpdateContentDto } from './dto/update-content.dto';

@ApiTags('content')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({ summary: 'Create new content' })
  @ApiBody({ type: ContentCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Content successfully created.',
    type: ContentDto,
  })
  async create(
    @GetUser() user: User,
    @Body(ValidationPipe)
    createContentDto: ContentCreateDto,
  ): Promise<ContentDto> {
    // TODO: Add validation for folder ownership
    return this.contentService.create(createContentDto, user.id);
  }

  @Post('list')
  @ApiBody({ type: ContentFilterDto })
  async getContent(
    @GetUser() user: User,
    @Body(ValidationPipe) filters: ContentFilterDto,
  ): Promise<{
    data: ContentDto[];
    pagination: { nextCursor: string | null; hasMore: boolean };
  }> {
    return await this.contentService.getContentWithPagination(user.id, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Content successfully retrieved.',
    type: ContentDto,
  })
  async findOne(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentDto> {
    return this.contentService.findOne(id, user.id);
  }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update content by ID' })
  // @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  // @ApiBody({ type: UpdateContentDto })
  // @ApiResponse({ status: 200, description: 'Content successfully updated.' })
  // @ApiResponse({ status: 404, description: 'Content not found.' })
  // @ApiResponse({ status: 401, description: 'Unauthorized.' })
  // @ApiResponse({ status: 403, description: 'Access denied.' })
  // async update(
  //   @GetUser() user: User,
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body(ValidationPipe) updateContentDto: UpdateContentDto,
  // ) {
  //   return this.contentService.update(id, updateContentDto, user.id);
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Content successfully deleted.' })
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id, user.id);
  }

  @Put(':id/folder')
  @ApiOperation({ summary: 'Add content to a folder' })
  @ApiBody({ type: AddToFolderDto })
  @ApiResponse({
    status: 201,
    description: 'Content successfully added to folder.',
    type: ContentDto,
  })
  async addToFolder(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe)
    addToFolderDto: AddToFolderDto,
  ): Promise<ContentDto> {
    return this.contentService.addToFolder(id, addToFolderDto, user.id);
  }
}
