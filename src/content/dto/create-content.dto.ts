import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  url: string;

  @IsString()
  @IsNotEmpty()
  folderId: string;
}
