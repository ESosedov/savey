import { Injectable, Logger } from '@nestjs/common';
import { ContentDto } from '../dto/content.dto';
import { ImageDataService } from './image-data.service';
import { ImageData } from '../../content/interfaces/image-data.interface';

@Injectable()
export class OembedService {
  private readonly logger = new Logger(OembedService.name);

  constructor(private readonly imageDataService: ImageDataService) {}

  public async getPreview(url: string): Promise<ContentDto | null> {
    try {
      if (!this.isYouTubeUrl(url)) {
        return null;
      }

      return await this.getYouTubePreview(url);
    } catch (err) {
      this.logger.error(`Error scraping URL: ${url}`, err.stack);
      return null;
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

  private async getYouTubePreview(url: string): Promise<ContentDto> {
    const videoId = this.extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    try {
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error(`oEmbed API returned ${response.status}`);
      }

      const data = await response.json();
      let imageData: ImageData | null = null;
      const thumbnailUrl = data.thumbnail_url;
      if (thumbnailUrl && typeof thumbnailUrl === 'string') {
        imageData =
          await this.imageDataService.downloadAndStoreImage(thumbnailUrl);
      }

      return {
        title: data.title,
        description: `${data.author_name} - YouTube`,
        image: imageData,
        url: url,
        type: 'video.other',
        siteName: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico',
      } as ContentDto;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get link preview for ${url}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
