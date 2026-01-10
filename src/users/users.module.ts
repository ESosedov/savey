import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Folder } from '../folders/entities/folder.entity';
import { MailModule } from '../mail/mail.module';
import { TokenModule } from '../auth/token.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Folder]), MailModule, TokenModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
