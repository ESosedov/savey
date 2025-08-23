import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  url: string;

  @ApiProperty({
    description: 'Folder ID where content will be stored',
    example: 'uuid-folder-id',
  })
  @IsString()
  @IsNotEmpty()
  folderId: string;
}
