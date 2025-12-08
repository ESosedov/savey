import { Injectable } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { ImageData } from '../../content/interfaces/image-data.interface';

@Injectable()
export class ImageDataService {
  private readonly publicDomain: string;
  constructor(
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.publicDomain = this.configService.getOrThrow<string>('PUBLIC_DOMAIN');
  }
  async downloadAndStoreImageFromArray(
    images: Array<{ url: string }> | undefined,
  ): Promise<ImageData | null> {
    if (!images || images.length === 0) {
      return null;
    }

    for (const image of images) {
      if (!image.url.startsWith('https://')) {
        continue;
      }

      try {
        return await this.downloadAndStoreImage(image.url);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('Error get image:', errorMessage);
      }
    }

    return null;
  }

  async downloadAndStoreImage(url: string): Promise<ImageData | null> {
    const image = await this.getImageByUrl(url);
    if (!image) {
      return null;
    }

    const { id, width, height } = await this.saveImage(image);
    const newUrl = `https://${this.publicDomain}/images/${id}.webp`;

    return {
      width,
      height,
      url: newUrl,
    };
  }

  async getImageByUrl(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching image:', errorMessage);
      throw error;
    }
  }

  async saveImage(
    image: Buffer,
  ): Promise<{ id: string; width: number; height: number }> {
    return this.storage.uploadImage(image);
  }
}
