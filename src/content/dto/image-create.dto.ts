import { ApiProperty } from '@nestjs/swagger';
import { ImageData } from '../interfaces/image-data.interface';
import { IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class ImageCreateDto implements ImageData {
  @ApiProperty({
    description: 'Height of the image',
    example: 720,
  })
  @IsNumber()
  height: number;

  @ApiProperty({
    description: 'URL of the image',
    example: 'https://i.ytimg.com/vi/psAxqfx-plc/maxresdefault.jpg',
  })
  @IsString()
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Width of the image',
    example: 1280,
  })
  @IsNumber()
  @IsOptional()
  width: number;
}
