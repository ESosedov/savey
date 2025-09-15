import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class FolderFilterDto {
  @ApiProperty({
    example: 'some title',
    description: 'Filter by title',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
