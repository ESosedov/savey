import { Expose, Type } from 'class-transformer';
import { OauthProviderDto } from './oauthProvider.dto';

export class UserDto {
  @Expose()
  firstName?: string | null;

  @Expose()
  lastName?: string | null;

  @Expose()
  email?: string | null;
  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => OauthProviderDto)
  oauthProviders: OauthProviderDto[];
}
