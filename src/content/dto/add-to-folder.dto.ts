import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddToFolderDto {
  @ApiProperty({
    example: '1022e2c1-8ff1-4803-a2e2-c18ff1580355',
    description: 'Folder ID to add content to',
  })
  @IsUUID()
  @IsNotEmpty()
  folderId: string;
}
