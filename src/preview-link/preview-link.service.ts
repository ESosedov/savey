import { BadRequestException, Injectable } from '@nestjs/common';
import { LinkPreviewService } from './services/link-preview.service';
import { OpenGraphService } from './services/opengraph.service';
import { OembedService } from './services/oembed.service';
import { ContentDto } from './dto/content.dto';
import { IframelyService } from './services/iframely.service';

@Injectable()
export class PreviewLinkService {
  constructor(
    private readonly linkPreviewService: LinkPreviewService,
    private readonly opengraphService: OpenGraphService,
    private readonly oembedService: OembedService,
    private readonly iframelyService: IframelyService,
  ) {}
  async getPreview(url: string): Promise<ContentDto> {
    this.validateUrl(url);

    // const oembedResult = await this.oembedService.getPreview(url);
    // if (oembedResult) {
    //   return oembedResult;
    // }
    //
    // const opengraphResult = await this.opengraphService.getPreview(url);
    // if (opengraphResult) {
    //   return opengraphResult;
    // }
    //
    // const linkPreviewResult = await this.linkPreviewService.getPreview(url);
    // if (linkPreviewResult) {
    //   return linkPreviewResult;
    // }

    const dto = await this.iframelyService.getPreview(url);
    if (dto) {
      return dto;
    }

    return this.createFallbackContent(url);
  }

  private createFallbackContent(url: string): ContentDto {
    return {
      title: null,
      description: null,
      image: null,
      url: url,
      type: null,
      siteName: null,
      favicon: null,
    };
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
}
