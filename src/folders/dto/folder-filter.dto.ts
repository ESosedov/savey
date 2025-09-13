import { IsString, IsOptional } from 'class-validator';
export class FolderFilterDto {
  @IsOptional()
  @IsString()
  search?: string;
}
