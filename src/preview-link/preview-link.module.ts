import { Module } from '@nestjs/common';
import { PreviewLinkController } from './preview-link.controller';
import { PreviewLinkService } from './preview-link.service';
import { LinkPreviewService } from './services/link-preview.service';
import { OembedService } from './services/oembed.service';
import { OpenGraphService } from './services/opengraph.service';
import { ImageDataService } from './services/image-data.service';

@Module({
  providers: [
    ImageDataService,
    LinkPreviewService,
    OembedService,
    OpenGraphService,
    PreviewLinkService,
  ],
  controllers: [PreviewLinkController],
  exports: [PreviewLinkService],
})
export class PreviewLinkModule {}
