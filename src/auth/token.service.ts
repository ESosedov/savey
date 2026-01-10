import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async generateTokens(
    user: User,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Generate access token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
      deviceInfo,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}