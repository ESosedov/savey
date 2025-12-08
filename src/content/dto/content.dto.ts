import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Folder } from '../../folders/entities/folder.entity';
import { ImageDto } from './image.dto';

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
  folders: Folder[];

  @Expose()
  @Transform(({ obj }) => obj.folders?.map((f: Folder) => f.id) || [])
  folderIds: string[];

  @Expose()
  favicon?: string | null;

  @Expose()
  siteName?: string | null;

  @Expose()
  @Type(() => ImageDto)
  image?: ImageDto | null;

  @Expose()
  description?: string | null;

  @Expose()
  type?: string | null;

  @Expose({ name: 'createdAt' })
  savedAt: Date;

  @Exclude()
  updatedAt: Date;
}
