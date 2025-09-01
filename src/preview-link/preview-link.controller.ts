import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PreviewLinkService } from './preview-link.service';
import { ContentDto } from './dto/content.dto';

@ApiTags('preview-link')
@Controller('preview-link')
export class PreviewLinkController {
  constructor(private readonly previewLinkService: PreviewLinkService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get OpenGraph preview by URL' })
  @ApiResponse({ status: 200, description: 'Preview data', type: ContentDto })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  async getPreview(@Query('url') url: string): Promise<ContentDto> {
    return this.previewLinkService.getPreview(url);
  }
}
