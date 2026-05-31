import { Inject, Injectable } from '@nestjs/common';
import { MINIO_BUCKET_NAME, MINIO_CLIENT } from './storage.constants';
import * as Minio from 'minio';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export const STORAGE_LIMIT_BYTES = 250 * 1024 * 1024; // 250 MB

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

  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    prefix: string,
  ): Promise<{ key: string; size: number }> {
    const uuid = uuidv4();
    const ext = this.extFromMime(mimeType);
    const key = `${prefix}/${uuid}${ext}`;

    await this.minioClient.putObject(
      this.bucketName,
      key,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );

    return { key, size: buffer.length };
  }

  async deleteFile(key: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, key);
  }

  private extFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'text/plain': '.txt',
    };
    return map[mimeType] ?? '';
  }
}
