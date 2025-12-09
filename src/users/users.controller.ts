import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../common/decorators/public.decorator';
import { GetUser } from '../auth/decorators/user.decorator';
import { User } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // @Get()
  // @ApiOperation({ summary: 'Get all users' })
  // @ApiResponse({ status: 200, description: 'Users successfully retrieved.' })
  // async findAll() {
  //   return this.usersService.findAll();
  // }

  @Get()
  @ApiOperation({ summary: 'Get user' })
  @ApiResponse({ status: 200, description: 'User successfully retrieved.' })
  async findOne(@GetUser() user: User) {
    return this.usersService.getOne(user.id);
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User successfully updated.' })
  async update(
    @GetUser() user: User,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, updateUserDto);
  }

  // @Delete(':id')
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Delete user by ID' })
  // @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  // @ApiResponse({ status: 200, description: 'User successfully deleted.' })
  // @ApiResponse({ status: 404, description: 'User not found.' })
  // @ApiResponse({ status: 401, description: 'Unauthorized.' })
  // async remove(@Param('id', ParseUUIDPipe) id: string) {
  //   // TODO: Add validation for user ownership
  //   return this.usersService.remove(id);
  // }
}
