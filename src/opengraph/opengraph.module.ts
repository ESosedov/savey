import { Module } from '@nestjs/common';
import { OpenGraphService } from './opengraph.service';
import { OpenGraphController } from './opengraph.controller';

@Module({
  providers: [OpenGraphService],
  controllers: [OpenGraphController],
  exports: [OpenGraphService],
})
export class OpenGraphModule {}
