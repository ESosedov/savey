import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { FolderDto } from './dto/folder.dto';
import { FolderFilterDto } from './dto/folder-filter.dto';

@ApiTags('folders')
@ApiBearerAuth()
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new folder' })
  @ApiBody({ type: CreateFolderDto })
  @ApiResponse({
    status: 201,
    description: 'Folder successfully created.',
    type: FolderDto,
  })
  async create(
    @GetUser() user: User,
    @Body(ValidationPipe)
    createFolderDto: CreateFolderDto,
  ): Promise<FolderDto> {
    return this.foldersService.create(createFolderDto, user.id);
  }

  @Post('list')
  @ApiOperation({ summary: 'Get list of folders' })
  @ApiBody({ type: FolderFilterDto })
  @ApiResponse({
    status: 200,
    description: 'List of folders successfully retrieved.',
    type: [FolderDto],
  })
  async getList(
    @GetUser() user: User,
    @Body(ValidationPipe) filters: FolderFilterDto,
  ): Promise<FolderDto[]> {
    return this.foldersService.getList(filters, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Folder successfully retrieved.',
    type: FolderDto,
  })
  async findOne(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any> {
    return this.foldersService.findOne(id, user.id);
  }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update folder by ID' })
  // @ApiParam({ name: 'id', description: 'Folder ID', type: 'string' })
  // @ApiBody({ type: UpdateFolderDto })
  // @ApiResponse({ status: 200, description: 'Folder successfully updated.' })
  // async update(
  //   @GetUser() user: User,
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body(ValidationPipe) updateFolderDto: UpdateFolderDto,
  // ) {
  //   return this.foldersService.update(id, updateFolderDto, user.id);
  // }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete folder by ID' })
  @ApiParam({ name: 'id', description: 'Folder ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Folder successfully deleted.' })
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.remove(id, user.id);
  }
}
