import { ImageData } from '../../content/interfaces/image-data.interface';

export class ContentDto {
  title?: string | null;
  description?: string | null;
  image?: ImageData | null;
  url?: string | null;
  type?: string | null;
  siteName?: string | null;
  favicon?: string | null;
}
