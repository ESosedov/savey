import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SimilarContentCreateDto {
  @ApiProperty({
    description: 'Content title',
    example: 'My awesome article',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Content URL',
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Content description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
