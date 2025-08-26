import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import ogs from 'open-graph-scraper';
import { OpenGraphDto } from './dto/opengraph.dto';
import { OpenGraphOptions } from './interfaces/opengraph-options.interface';

@Injectable()
export class OpenGraphService {
  private readonly logger = new Logger(OpenGraphService.name);

  async getPreview(
    url: string,
    options?: OpenGraphOptions,
  ): Promise<OpenGraphDto> {
    try {
      this.validateUrl(url);

      const ogsOptions = {
        url,
        timeout: options?.timeout || 10,
        fetchOptions: {
          headers: {
            'user-agent':
              options?.userAgent ||
              'Mozilla/5.0 (compatible; OpenGraphScraper/1.0; +https://github.com/jshemas/openGraphScraper)',
          },
        },
        onlyGetOpenGraphInfo: options?.onlyGetOpenGraphInfo || false,
        customMetaTags: options?.customMetaTags || [],
        blacklist: options?.blacklist || [],
      };

      const { result, error } = await ogs(ogsOptions);

      if (error) {
        this.logger.error(`Failed to scrape URL: ${url}`, error);
        throw new BadRequestException('Failed to scrape the provided URL');
      }

      return this.mapToDto(result);
    } catch (err) {
      this.logger.error(`Error scraping URL: ${url}`, err.stack);

      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new BadRequestException('Invalid URL or scraping failed');
    }
  }

  async getPreviewFromHtml(
    html: string,
    options?: OpenGraphOptions,
  ): Promise<OpenGraphDto> {
    try {
      const ogsOptions = {
        html,
        onlyGetOpenGraphInfo: options?.onlyGetOpenGraphInfo || false,
        customMetaTags: options?.customMetaTags || [],
      };

      const { result, error } = await ogs(ogsOptions);

      if (error) {
        this.logger.error('Failed to parse HTML', error);
        throw new BadRequestException('Failed to parse the provided HTML');
      }

      return this.mapToDto(result);
    } catch (err) {
      this.logger.error('Error parsing HTML', err.stack);
      throw new BadRequestException('HTML parsing failed');
    }
  }

  private validateUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new BadRequestException('URL must start with http:// or https://');
    }
  }

  private mapToDto(result: any): OpenGraphDto {
    return {
      ogTitle: result.ogTitle,
      ogDescription: result.ogDescription,
      ogImage: result.ogImage,
      ogUrl: result.ogUrl,
      ogType: result.ogType,
      ogSiteName: result.ogSiteName,
      charset: result.charset,
      favicon: result.favicon,
      success: result.success || false,
    };
  }
}
