import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MINIO_BUCKET_NAME, MINIO_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';
import * as Minio from 'minio';

@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    {
      provide: MINIO_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Minio.Client({
          endPoint: configService.get('MINIO_ENDPOINT') || '',
          port: parseInt(<string>configService.get('MINIO_PORT')) || 9000,
          useSSL: configService.get('MINIO_USE_SSL') === 'true',
          accessKey: configService.get('MINIO_ACCESS_KEY'),
          secretKey: configService.get('MINIO_SECRET_KEY'),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: MINIO_BUCKET_NAME,
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('MINIO_BUCKET_NAME');
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
