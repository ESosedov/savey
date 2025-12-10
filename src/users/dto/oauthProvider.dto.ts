import { Expose } from 'class-transformer';

export class OauthProviderDto {
  @Expose()
  provider: string;
  @Expose()
  picture?: string | null;
}
