import { Injectable, Logger } from '@nestjs/common';
import {
  ILinkPreviewResponse,
  LinkPreviewOptions,
} from './interfaces/link-preview.interface';
import { getLinkPreview } from 'link-preview-js';

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  async getPreview(
    url: string,
    options?: LinkPreviewOptions,
  ): Promise<any> {
    try {
      this.logger.debug(`Getting link preview for: ${url}`);

      return await getLinkPreview(url, {
        timeout: options?.timeout || 5000,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
          ...options?.headers,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get link preview for ${url}: ${error.message}`,
      );
      throw new Error(`Unable to get preview for URL: ${url}`);
    }
  }
}
