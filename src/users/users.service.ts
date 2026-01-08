import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Folder } from '../folders/entities/folder.entity';
import * as bcrypt from 'bcrypt';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    const existingUser = await this.findByEmail(createUserDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

    const user = this.userRepository.create({
      ...createUserDto,
      passwordHash,
      emailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    const favoriteFolder = this.folderRepository.create({
      title: 'Favorite',
      isPublic: false,
      userId: savedUser.id,
      user: savedUser,
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

        if (!user.emailVerified) {
          user.emailVerified = true;
          user.emailVerificationToken = null;
          user.emailVerificationTokenExpiry = null;
        }

        user = await this.userRepository.save(user);
      }
    } else {
      user = this.userRepository.create({
        email: googleData.email,
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        passwordHash: '',
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
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

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: {
        email,
        emailVerificationToken: code,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (
      !user.emailVerificationTokenExpiry ||
      user.emailVerificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException('Verification code has expired');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiry = null;

    await this.userRepository.save(user);

    return { message: 'Email successfully verified' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = this.generateVerificationToken();
    const tokenExpiry = new Date();
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 3);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpiry = tokenExpiry;

    await this.userRepository.save(user);

    await this.mailService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationToken,
    );

    return { message: 'Verification email sent' };
  }

  private generateVerificationToken(): string {
    // Generate 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
