import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Folder } from '../folders/entities/folder.entity';
import * as bcrypt from 'bcrypt';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);
    const user = this.userRepository.create({
      ...createUserDto,
      passwordHash,
    });
    const savedUser = await this.userRepository.save(user);

    const favoriteFolder = this.folderRepository.create({
      title: 'Favorite',
      isPublic: false,
      userId: savedUser.id,
      user: user,
    });
    await this.folderRepository.save(favoriteFolder);

    return plainToInstance(UserDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(id: string): Promise<UserDto> {
    const user = await this.findOne(id);

    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);

    return plainToInstance(UserDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findOrCreateGoogleUser(googleData: {
    email: string;
    firstName: string;
    lastName: string;
    providerId: string;
    picture?: string;
  }): Promise<User> {
    let user = await this.findByEmail(googleData.email);

    if (user) {
      const hasGoogleProvider = user.oauthProviders?.some(
        (provider) =>
          provider.provider === 'google' &&
          provider.providerId === googleData.providerId,
      );

      if (!hasGoogleProvider) {
        const oauthProviders = user.oauthProviders || [];
        oauthProviders.push({
          provider: 'google',
          providerId: googleData.providerId,
          picture: googleData.picture,
        });
        user.oauthProviders = oauthProviders;
        user = await this.userRepository.save(user);
      }
    } else {
      user = this.userRepository.create({
        email: googleData.email,
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        passwordHash: '',
        oauthProviders: [
          {
            provider: 'google',
            providerId: googleData.providerId,
            picture: googleData.picture,
          },
        ],
      });
      const savedUser = await this.userRepository.save(user);

      const favoriteFolder = this.folderRepository.create({
        title: 'Favorite',
        isPublic: false,
        userId: savedUser.id,
        user: savedUser,
      });
      await this.folderRepository.save(favoriteFolder);

      user = savedUser;
    }

    return user;
  }
}
