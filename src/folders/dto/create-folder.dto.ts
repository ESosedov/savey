import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}
