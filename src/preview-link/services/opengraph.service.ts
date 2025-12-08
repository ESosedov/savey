import { Injectable, Logger } from '@nestjs/common';
import ogs from 'open-graph-scraper';
import { ContentDto } from '../dto/content.dto';
import { ImageDataService } from './image-data.service';
import { ImageData } from '../../content/interfaces/image-data.interface';
import { OgObjectInternal } from 'open-graph-scraper/types';

@Injectable()
export class OpenGraphService {
  private readonly logger = new Logger(OpenGraphService.name);

  constructor(private readonly imageDataService: ImageDataService) {}

  async getPreview(url: string): Promise<ContentDto | null> {
    const ogsOptions = {
      url,
      timeout: 15,
      fetchOptions: {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9,ru;q=0.8',
          'accept-encoding': 'gzip, deflate, br',
          dnt: '1',
          connection: 'keep-alive',
          'upgrade-insecure-requests': '1',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
      },
      onlyGetOpenGraphInfo: false,
      customMetaTags: [],
      blacklist: [],
    };

    try {
      const { result, error } = await ogs(ogsOptions);

      if (error || result.success === false) {
        return null;
      }

      const imageData =
        await this.imageDataService.downloadAndStoreImageFromArray(
          result.ogImage,
        );

      return this.mapToDto(result, imageData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get link preview for ${url}: ${errorMessage}`,
      );
      return null;
    }
  }

  private mapToDto(
    result: OgObjectInternal,
    imageData?: ImageData | null,
  ): ContentDto {
    return {
      title: result.ogTitle,
      description: result.ogDescription,
      image: imageData,
      url: result.ogUrl,
      type: result.ogType,
      siteName: result.ogSiteName,
      favicon: result.favicon,
    };
  }
}
