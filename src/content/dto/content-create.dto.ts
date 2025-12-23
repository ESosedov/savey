import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ImageCreateDto } from './image-create.dto';
import { Type } from 'class-transformer';

export class ContentCreateDto {
  @ApiProperty({
    description: 'Content title',
    example: 'My awesome article',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Content URL',
    example: 'https://example.com/article',
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({
    description: 'Folder IDs where content will be stored',
    example: ['uuid-folder-id-1', 'uuid-folder-id-2'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  folderIds?: string[];

  @ApiProperty({
    description: '',
    example: '',
  })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({
    description: '',
    example: '',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '',
    example: '',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Image metadata',
    type: ImageCreateDto,
    required: false,
    example: {
      height: '720',
      url: 'https://i.ytimg.com/vi/psAxqfx-plc/maxresdefault.jpg',
      width: '1280',
    },
  })
  @IsOptional()
  @Type(() => ImageCreateDto)
  @ValidateNested()
  image?: ImageCreateDto;

  @ApiProperty({
    description: '',
    example: '',
  })
  @IsString()
  @IsOptional()
  favicon?: string;

  @ApiProperty({
    description: '',
    example: '',
  })
  @IsString()
  @IsOptional()
  siteName?: string;
}
