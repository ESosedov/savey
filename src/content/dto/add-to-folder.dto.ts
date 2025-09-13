import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddToFolderDto {
  @ApiProperty({
    description: 'Folder ID to add content to',
  })
  @IsUUID()
  @IsNotEmpty()
  folderId: string;
}
