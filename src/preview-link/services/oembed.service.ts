import { Logger } from '@nestjs/common';
import { ContentDto } from '../dto/content.dto';

export class OembedService {
  private readonly logger = new Logger(OembedService.name);

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

      return {
        title: data.title,
        description: `${data.author_name} - YouTube`,
        image: data.thumbnail_url
          ? {
              url: data.thumbnail_url,
              width: data.thumbnail_width,
              height: data.thumbnail_height,
              type: 'jpg',
            }
          : null,
        url: url,
        type: 'video.other',
        siteName: 'YouTube',
        favicon: 'https://www.youtube.com/favicon.ico',
      } as ContentDto;
    } catch (error) {
      this.logger.error(
        `Failed to get link preview for ${url}: ${error.message}`,
      );
      throw error;
    }
  }
}
