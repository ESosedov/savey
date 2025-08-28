import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { FoldersModule } from './folders/folders.module';
import { ContentModule } from './content/content.module';
import { AuthModule } from './auth/auth.module';
import { OpenGraphModule } from './opengraph/opengraph.module';
import { LinkPreviewModule } from './link-preview/link-preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 5432,
        username: configService.get<string>('DB_USERNAME') || 'admin',
        password: configService.get<string>('DB_PASSWORD') || 'password',
        database: configService.get<string>('DB_DATABASE') || 'nestjs_api',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ContentModule,
    FoldersModule,
    OpenGraphModule,
    UsersModule,
    LinkPreviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
