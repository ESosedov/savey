import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
export class ContentFilterDto {
  @ApiProperty({
    example: '7dfgh4390fghd',
    description: 'Cursor for pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    example: 'some title',
    description: 'Filter by title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: '1022e2c1-8ff1-4803-a2e2-c18ff1580355',
    description: 'Filter by folder ID',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
