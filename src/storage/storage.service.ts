import { Inject, Injectable } from '@nestjs/common';
import { MINIO_BUCKET_NAME, MINIO_CLIENT } from './storage.constants';
import * as Minio from 'minio';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  constructor(
    @Inject(MINIO_CLIENT) private readonly minioClient: Minio.Client,
    @Inject(MINIO_BUCKET_NAME) private readonly bucketName: string,
  ) {}

  async uploadImage(
    file: Buffer,
  ): Promise<{ id: string; width: number; height: number }> {
    const uuid = uuidv4();

    const resizedImage = sharp(file)
      .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 });

    const [buffer640, metadata] = await Promise.all([
      resizedImage.toBuffer(),
      resizedImage.metadata(),
    ]);

    const path = `${uuid}.webp`;

    await this.minioClient.putObject(
      this.bucketName,
      path,
      buffer640,
      buffer640.length,
      { 'Content-Type': 'image/webp' },
    );

    return {
      id: uuid,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    };
  }
}
