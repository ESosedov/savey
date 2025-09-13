import { Expose } from 'class-transformer';

export class ImageDto {
  @Expose()
  url?: string;

  @Expose()
  width?: number;

  @Expose()
  height?: number;
}
