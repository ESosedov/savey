import { Exclude, Expose } from 'class-transformer';

export class SimilarContentDto {
  @Expose()
  title: string;

  @Expose()
  url: string;

  @Expose()
  description?: string | null;
}
