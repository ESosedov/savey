import { ImageData } from '../interfaces/image-data.interface';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Folder } from '../../folders/entities/folder.entity';

export class ContentDto {
  @Expose()
  id: string;

  @Expose()
  title?: string | null;

  @Expose()
  url?: string | null;

  @Expose()
  domain?: string | null;

  @Exclude()
  user: User;

  @Exclude()
  userId: string;

  @Exclude()
  folder: Folder;

  @Exclude()
  folderId: string;

  @Expose()
  favicon?: string | null;

  @Expose()
  siteName?: string | null;

  @Expose()
  image?: ImageData | null;

  @Expose()
  description?: string | null;

  @Expose()
  type?: string | null;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
