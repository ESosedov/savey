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
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('folders')
@ApiBearerAuth()
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new folder' })
  @ApiBody({ type: CreateFolderDto })
  @ApiResponse({ status: 201, description: 'Folder successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(
    @GetUser() user: User,
    @Body(ValidationPipe)
    createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.create(createFolderDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user folders' })
  @ApiResponse({ status: 200, description: 'Folders successfully retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@GetUser() user: User) {
    return this.foldersService.findByUser(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search user folders' })
  @ApiQuery({ name: 'q', description: 'Search query', type: 'string' })
  @ApiResponse({ status: 200, description: 'Search results retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async search(@GetUser() user: User, @Query('q') query: string) {
    return this.foldersService.search(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Folder successfully retrieved.' })
  @ApiResponse({ status: 404, description: 'Folder not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder ID', type: 'string' })
  @ApiBody({ type: UpdateFolderDto })
  @ApiResponse({ status: 200, description: 'Folder successfully updated.' })
  @ApiResponse({ status: 404, description: 'Folder not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateFolderDto: UpdateFolderDto,
  ) {
    return this.foldersService.update(id, updateFolderDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Folder successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Folder not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.remove(id, user.id);
  }
}
