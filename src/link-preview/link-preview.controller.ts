import { Controller, Get, Query } from '@nestjs/common';
import { LinkPreviewService } from './link-preview.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Public()
  @Get()
  async getPreview(@Query('url') url: string) {
    if (!url) {
      throw new Error('URL parameter is required');
    }

    return await this.linkPreviewService.getPreview(url);
  }
}
