import { Injectable, Logger } from '@nestjs/common';
import ogs from 'open-graph-scraper';
import probe from 'probe-image-size';
import { ContentDto } from '../dto/content.dto';

@Injectable()
export class OpenGraphService {
  private readonly logger = new Logger(OpenGraphService.name);

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

      const imageData = await this.getImageData(result.ogImage);

      return this.mapToDto(result, imageData);
    } catch (error) {
      this.logger.error(
        `Failed to get link preview for ${url}: ${error.message}`,
      );
      return null;
    }
  }

  async getImageData(image: any): Promise<any> {
    try {
      const result = await probe(image[0].url);
      return {
        width: Number(result.width),
        height: Number(result.height),
        url: result.url,
        type: result.type,
      };
    } catch (error) {
      console.error('Error get image:', error.message);
      return null;
    }
  }

  private mapToDto(result: any, imageData?: any): ContentDto {
    let image = result.ogImage;
    if (imageData) {
      image = imageData;
    }
    return {
      title: result.ogTitle,
      description: result.ogDescription,
      image: image,
      url: result.ogUrl,
      type: result.ogType,
      siteName: result.ogSiteName,
      favicon: result.favicon,
    };
  }
}
