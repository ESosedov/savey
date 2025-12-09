import { Expose } from 'class-transformer';

export class OauthProvider {
  @Expose()
  provider: string;
  @Expose()
  picture?: string | null;
}
