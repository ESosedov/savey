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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
// import { UpdateContentDto } from './dto/update-content.dto';

@ApiTags('content')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({ summary: 'Create new content' })
  @ApiBody({ type: CreateContentDto })
  @ApiResponse({ status: 201, description: 'Content successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Folder not found.' })
  async create(
    @GetUser() user: User,
    @Body(ValidationPipe)
    createContentDto: CreateContentDto,
  ) {
    // TODO: Add validation for folder ownership
    return this.contentService.create(createContentDto, user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search user content' })
  @ApiQuery({ name: 'q', description: 'Search query', type: 'string' })
  @ApiResponse({ status: 200, description: 'Search results retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async search(@GetUser() user: User, @Query('q') query: string) {
    return this.contentService.search(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Content successfully retrieved.' })
  @ApiResponse({ status: 404, description: 'Content not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
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
  @ApiResponse({ status: 404, description: 'Content not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.remove(id, user.id);
  }
}
