import { Expose } from 'class-transformer';

export class FolderDto {
  @Expose()
  id: string;

  @Expose()
  title?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  isPublic?: boolean;

  @Expose()
  images: string[];

  @Expose()
  userId: string;
}
