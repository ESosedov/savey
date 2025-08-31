import { ImageData } from '../../content/interfaces/image-data.interface';

export class OpenGraphDto {
  title?: string;
  description?: string;
  image?: ImageData;
  url?: string;
  type?: string;
  siteName?: string;
  favicon?: string;
}

export class GetPreviewDto {
  url: string;
}
