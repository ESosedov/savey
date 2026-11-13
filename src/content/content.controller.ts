import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ValidationPipe,
  ParseUUIDPipe,
  Put,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { ContentService } from './content.service';
import { ContentCreateDto } from './dto/content-create.dto';
import { ContentFilterDto } from './dto/content-filter.dto';
import { ContentDto } from './dto/content.dto';
import { AddToFolderDto } from './dto/add-to-folder.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { SimilarContentService } from './services/similar-content.service';
import { SimilarContentCreateDto } from './dto/similar-content/similar-content-create.dto';
import { SimilarContentDto } from './dto/similar-content/similar-content.dto';
import { ContentType } from './entities/content.entity';
import { SearchContentDto } from './dto/search-content.dto';

const LINK_ONLY = [ContentType.LINK];
const LINK_AND_PHOTO = [ContentType.LINK, ContentType.PHOTO];

@ApiTags('content')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly similarContentService: SimilarContentService,
  ) {}

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
    return this.contentService.create(
      { ...createContentDto, contentType: ContentType.LINK },
      user.id,
    );
  }

  @Post('search')
  @ApiOperation({ summary: 'Semantic search with text fallback' })
  @ApiBody({ type: SearchContentDto })
  @ApiResponse({ status: 200, type: [ContentDto] })
  async search(
    @GetUser() user: User,
    @Body(ValidationPipe) dto: SearchContentDto,
  ): Promise<ContentDto[]> {
    return this.contentService.search(
      user.id,
      dto.query,
      dto.limit ?? 20,
      LINK_AND_PHOTO,
    );
  }

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Upload photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: ContentDto })
  async uploadPhoto(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ): Promise<ContentDto> {
    if (!file) throw new BadRequestException('File is required');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed');
    }
    return this.contentService.createPhoto(
      user.id,
      file.buffer,
      file.mimetype,
      title,
      description,
    );
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
    return this.contentService.getContentWithPagination(
      user.id,
      filters,
      LINK_AND_PHOTO,
    );
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
    return this.contentService.getOne(id, user.id, LINK_ONLY);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiBody({ type: UpdateContentDto })
  @ApiResponse({ status: 200, description: 'Content successfully updated.' })
  @ApiResponse({ status: 404, description: 'Content not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateContentDto: UpdateContentDto,
  ): Promise<ContentDto> {
    return this.contentService.update(id, updateContentDto, user.id, LINK_ONLY);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Content successfully deleted.' })
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id, user.id, LINK_ONLY);
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
    return this.contentService.addToFolder(
      id,
      addToFolderDto,
      user.id,
      LINK_ONLY,
    );
  }

  @Delete(':id/folder/:folderId')
  @ApiOperation({ summary: 'Remove content from a folder' })
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiParam({ name: 'folderId', description: 'Folder ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Content successfully removed from folder.',
    type: ContentDto,
  })
  async removeFromFolder(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<ContentDto> {
    return this.contentService.removeFromFolder(
      id,
      folderId,
      user.id,
      LINK_ONLY,
    );
  }

  @Post(':id/similar/add')
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiBody({ type: [SimilarContentCreateDto] })
  @ApiResponse({
    status: 200,
    description: 'Similar Content successfully added.',
    type: [SimilarContentDto],
  })
  async addSimilar(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe)
    similarContentCreateDto: SimilarContentCreateDto[],
  ): Promise<SimilarContentDto[]> {
    return this.similarContentService.addSimilar(
      id,
      user.id,
      similarContentCreateDto,
    );
  }
}
