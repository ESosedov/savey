import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import ogs from 'open-graph-scraper';
import { OpenGraphDto } from './dto/opengraph.dto';
import { OpenGraphOptions } from './interfaces/opengraph-options.interface';
import probe from 'probe-image-size';

@Injectable()
export class OpenGraphService {
  private readonly logger = new Logger(OpenGraphService.name);

  async getPreview(
    url: string,
    options?: OpenGraphOptions,
  ): Promise<OpenGraphDto> {
    try {
      this.validateUrl(url);

      // Специальная обработка для YouTube
      if (this.isYouTubeUrl(url)) {
        try {
          return await this.getYouTubePreview(url);
        } catch (error) {
          this.logger.warn(
            `YouTube API failed, falling back to scraping: ${error.message}`,
          );
          // Продолжаем с обычным скрапингом
        }
      }

      return await this.scrapeWithRetry(url, options);
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

  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  private async getYouTubePreview(url: string): Promise<OpenGraphDto> {
    const videoId = this.extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Используем YouTube oEmbed API
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    try {
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error(`oEmbed API returned ${response.status}`);
      }

      const data = await response.json();

      return {
        title: data.title,
        description: `${data.author_name} - YouTube`,
        image: data.thumbnail_url
          ? {
              url: data.thumbnail_url,
              width: data.thumbnail_width,
              height: data.thumbnail_height,
            }
          : undefined,
        url: url,
        type: 'video.other',
        siteName: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico',
      };
    } catch (error) {
      this.logger.error(`YouTube oEmbed API failed: ${error.message}`);
      throw error;
    }
  }

  private async scrapeWithRetry(
    url: string,
    options?: OpenGraphOptions,
  ): Promise<OpenGraphDto> {
    const maxRetries = 3;
    let lastError: any;

    // Разные User-Agent для попыток
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Добавляем задержку между попытками
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }

        const ogsOptions = {
          url,
          timeout: options?.timeout || 15,
          fetchOptions: {
            headers: {
              'user-agent': options?.userAgent || userAgents[attempt],
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
          onlyGetOpenGraphInfo: options?.onlyGetOpenGraphInfo || false,
          customMetaTags: options?.customMetaTags || [],
          blacklist: options?.blacklist || [],
        };

        const { result, error } = await ogs(ogsOptions);

        if (error) {
          throw new Error(`OGS error: ${error}`);
        }

        const imageData = await this.getImageData(result.ogImage);

        return this.mapToDto(result, imageData);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${attempt + 1} failed for URL: ${url}, error: ${error.message}`,
        );

        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === maxRetries - 1) {
          break;
        }
      }
    }

    this.logger.error(`All ${maxRetries} attempts failed for URL: ${url}`);
    throw new BadRequestException(
      'Failed to scrape the provided URL after multiple attempts',
    );
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
      console.error('Ошибка:', error.message);
      return null;
    }
  }

  private mapToDto(result: any, imageData?: any): OpenGraphDto {
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
