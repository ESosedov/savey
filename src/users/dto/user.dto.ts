import { Expose, Type } from 'class-transformer';
import { OauthProvider } from './oauthProvider';

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
  @Type(() => OauthProvider)
  oauthProviders: OauthProvider[];
}
