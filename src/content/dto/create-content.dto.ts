import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ImageDto } from './image.dto';
import { Type } from 'class-transformer';

export class CreateContentDto {
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
    description: 'Folder ID where content will be stored',
    example: 'uuid-folder-id',
  })
  @IsString()
  @IsOptional()
  folderId?: string;

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
    type: ImageDto,
    required: false,
    example: {
      height: '720',
      url: 'https://i.ytimg.com/vi/psAxqfx-plc/maxresdefault.jpg',
      width: '1280',
      type: 'jpg',
    },
  })
  @IsOptional()
  @Type(() => ImageDto)
  @ValidateNested()
  image?: ImageDto;

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
