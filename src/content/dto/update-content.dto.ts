import { PartialType } from '@nestjs/swagger';
import { ContentCreateDto } from './content-create.dto';

export class UpdateContentDto extends PartialType(ContentCreateDto) {}
