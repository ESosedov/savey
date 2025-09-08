import { Injectable, Logger } from '@nestjs/common';
import { getLinkPreview } from 'link-preview-js';
import { LinkPreviewOptions } from '../interfaces/link-preview.interface';
import probe from 'probe-image-size';
import { ContentDto } from '../dto/content.dto';

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  async getPreview(
    url: string,
    options?: LinkPreviewOptions,
  ): Promise<ContentDto | null> {
    try {
      const requestOptions: any = {
        timeout: options?.timeout || 10000,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36',
          accept: 'text/html,application/xhtml+xml',
          'accept-Language': 'en;q=0.8,ru;q=0.7',
          ...options?.headers,
        },
        followRedirects: 'follow',
      };

      const result = await getLinkPreview(url, requestOptions);
      let imageData = null;
      if ('images' in result) {
        const hasValidImages =
          result?.images &&
          Array.isArray(result.images) &&
          result.images.length > 0;
        imageData = hasValidImages
          ? await this.getImageData(result.images)
          : null;
      }

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
      const result = await probe(image[0]);
      return {
        width: Number(result.width),
        height: Number(result.height),
        url: result.url,
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
      title: result.title,
      description: result.description,
      image: image,
      url: result.url,
      type: result.mediaType,
      siteName: result.siteName,
      favicon: result.favicons[0] ?? null,
    };
  }

  private createRedirectHandler() {
    return (baseURL: string, forwardedURL: string): boolean => {
      try {
        const baseUrlObj = new URL(baseURL);
        const forwardedUrlObj = new URL(forwardedURL);

        // Разрешаем редиректы в пределах того же домена
        if (forwardedUrlObj.hostname === baseUrlObj.hostname) {
          return true;
        }

        // Разрешаем редиректы с www и без www
        if (
          forwardedUrlObj.hostname === 'www.' + baseUrlObj.hostname ||
          'www.' + forwardedUrlObj.hostname === baseUrlObj.hostname
        ) {
          return true;
        }

        // Разрешаем HTTP -> HTTPS редиректы
        if (
          baseUrlObj.protocol === 'http:' &&
          forwardedUrlObj.protocol === 'https:' &&
          forwardedUrlObj.hostname === baseUrlObj.hostname
        ) {
          return true;
        }

        // Разрешаем некоторые популярные сервисы редиректов
        const allowedRedirects = [
          't.co',
          'bit.ly',
          'tinyurl.com',
          'goo.gl',
          'ow.ly',
          'search.app',
          'app.search',
        ];

        if (allowedRedirects.includes(baseUrlObj.hostname)) {
          return true;
        }

        this.logger.warn(
          `Blocking redirect from ${baseURL} to ${forwardedURL}`,
        );
        return false;
      } catch (error) {
        this.logger.error(
          `Error handling redirect: ${(error as Error).message}`,
        );
        return false;
      }
    };
  }
}
