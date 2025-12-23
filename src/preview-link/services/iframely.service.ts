import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentDto } from '../dto/content.dto';
import { ImageData } from '../../content/interfaces/image-data.interface';
import { ImageDataService } from './image-data.service';
import { IframelyFullResponse } from '../interfaces/iframely-response.interface';

@Injectable()
export class IframelyService {
  private readonly logger = new Logger(IframelyService.name);
  private readonly iframelyUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly imageDataService: ImageDataService,
  ) {
    this.iframelyUrl = this.configService.getOrThrow<string>('IFRAMELY_URL');
  }

  async getPreview(url: string): Promise<ContentDto | null> {
    try {
      const encodedUrl = encodeURIComponent(url);
      const iframelyEndpoint = `${this.iframelyUrl}/iframely?url=${encodedUrl}`;
      const response = await fetch(iframelyEndpoint);

      if (!response.ok) {
        this.logger.warn(`Iframely returned ${response.status} for ${url}`);
        return null;
      }

      const data = (await response.json()) as IframelyFullResponse;

      // Ищем изображение (thumbnail) в links
      const imageLink = data.links?.find(
        (link) =>
          link.type?.startsWith('image/') && link.rel?.includes('thumbnail'),
      );

      let imageData: ImageData | null = null;
      if (imageLink && typeof imageLink?.href === 'string') {
        imageData = await this.imageDataService.downloadAndStoreImage(
          imageLink?.href,
        );
      }

      // Ищем favicon в links
      const faviconLink = data.links?.find(
        (link) =>
          link.rel?.includes('icon') ||
          link.type === 'image/x-icon' ||
          link.type === 'image/ico',
      );

      return {
        url: url,
        title: data.meta?.title || null,
        description: data.meta?.description || null,
        image: imageData,
        siteName: data.meta?.site || null,
        type: data.meta?.medium || 'link',
        favicon: faviconLink?.href || null,
      };
    } catch (error) {
      this.logger.error(`Iframely error for ${url}:`, error);
      return null;
    }
  }
}
