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
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  async create(
    @GetUser() user: User,
    @Body(ValidationPipe)
    createFolderDto: CreateFolderDto,
  ) {
    return this.foldersService.create(createFolderDto, user.id);
  }

  @Get()
  async findAll(@GetUser() user: User) {
    return this.foldersService.findByUser(user.id);
  }

  @Get('search')
  async search(@GetUser() user: User, @Query('q') query: string) {
    return this.foldersService.search(query, user.id);
  }

  @Get(':id')
  async findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.findOne(id, user.id);
  }

  @Patch(':id')
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateFolderDto: UpdateFolderDto,
  ) {
    return this.foldersService.update(id, updateFolderDto, user.id);
  }

  @Delete(':id')
  async remove(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.remove(id, user.id);
  }
}
