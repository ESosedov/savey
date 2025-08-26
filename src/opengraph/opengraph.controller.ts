import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OpenGraphService } from './opengraph.service';
import { OpenGraphDto, GetPreviewDto } from './dto/opengraph.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('opengraph')
@Controller('opengraph')
export class OpenGraphController {
  constructor(private readonly openGraphService: OpenGraphService) {}

  @Public()
  @Get('preview')
  @ApiOperation({ summary: 'Get OpenGraph preview by URL' })
  @ApiResponse({ status: 200, description: 'Preview data', type: OpenGraphDto })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  async getPreview(@Query('url') url: string): Promise<OpenGraphDto> {
    return this.openGraphService.getPreview(url);
  }

  @Public()
  @Post('preview')
  @ApiOperation({ summary: 'Get OpenGraph preview by URL (POST)' })
  @ApiResponse({ status: 200, description: 'Preview data', type: OpenGraphDto })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  @UsePipes(new ValidationPipe())
  async getPreviewPost(@Body() body: GetPreviewDto): Promise<OpenGraphDto> {
    return this.openGraphService.getPreview(body.url);
  }

  @Public()
  @Post('preview/html')
  @ApiOperation({ summary: 'Get OpenGraph preview from HTML content' })
  @ApiResponse({ status: 200, description: 'Preview data', type: OpenGraphDto })
  async getPreviewFromHtml(@Body('html') html: string): Promise<OpenGraphDto> {
    return this.openGraphService.getPreviewFromHtml(html);
  }
}
