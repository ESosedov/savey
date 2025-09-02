import { ImageData } from '../interfaces/image-data.interface';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

export class ContentDto {
  @Expose()
  id: string;

  @Expose()
  title?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  image?: ImageData | null;

  @Expose()
  url?: string | null;

  @Expose()
  type?: string | null;

  @Expose()
  siteName?: string | null;

  @Expose()
  favicon?: string | null;

  @Exclude()
  userId: string;

  @Exclude()
  user: User;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;
}
