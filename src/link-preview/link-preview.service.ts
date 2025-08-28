import { Injectable, Logger } from '@nestjs/common';
import {
  LinkPreviewOptions,
} from './interfaces/link-preview.interface';
import { getLinkPreview } from 'link-preview-js';

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  async getPreview(url: string, options?: LinkPreviewOptions): Promise<any> {
    try {
      this.logger.debug(`Getting link preview for: ${url}`);

      const requestOptions: any = {
        timeout: options?.timeout || 10000,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...options?.headers,
        },
      };

      // Настройка обработки редиректов
      if (options?.followRedirects !== false) {
        requestOptions.followRedirects = 'manual';
        requestOptions.handleRedirects = this.createRedirectHandler();
      }

      return await getLinkPreview(url, requestOptions);
    } catch (error) {
      this.logger.error(
        `Failed to get link preview for ${url}: ${error.message}`,
      );
      throw new Error(`Unable to get preview for URL: ${url}`);
    }
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
