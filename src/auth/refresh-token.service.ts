import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Create and store a new refresh token
   */
  async createRefreshToken(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    // 1. Generate JWT refresh token
    const payload = { sub: userId, type: 'refresh' };
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // 2. Hash the token for storage (bcrypt)
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // 3. Calculate expiration date
    const expiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const expiresAt = this.calculateExpirationDate(expiresIn);

    // 4. Store in database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash,
      userId,
      expiresAt,
      deviceInfo,
      ipAddress,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    // 5. Return plain token (not hash) to send to client
    return refreshToken;
  }

  /**
   * Validate and return user ID from refresh token
   */
  async validateRefreshToken(token: string): Promise<string> {
    try {
      // 1. Verify JWT signature and expiration
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 2. Find matching token in database
      const userId = payload.sub;
      const userTokens = await this.refreshTokenRepository.find({
        where: { userId, isRevoked: false },
      });

      // 3. Check if any stored hash matches
      let tokenFound = false;
      for (const storedToken of userTokens) {
        if (await bcrypt.compare(token, storedToken.tokenHash)) {
          tokenFound = true;
          break;
        }
      }

      if (!tokenFound) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return userId;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Rotate token: revoke old, create new
   */
  async rotateRefreshToken(
    oldToken: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    // 1. Validate old token
    const userId = await this.validateRefreshToken(oldToken);

    // 2. Revoke old token
    await this.revokeToken(oldToken, userId);

    // 3. Create new token
    return this.createRefreshToken(userId, deviceInfo, ipAddress);
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(token: string, userId: string): Promise<void> {
    const userTokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
    });

    for (const storedToken of userTokens) {
      if (await bcrypt.compare(token, storedToken.tokenHash)) {
        storedToken.isRevoked = true;
        await this.refreshTokenRepository.save(storedToken);
        return;
      }
    }
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Cleanup expired tokens (cron job)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  /**
   * Helper: Convert time string to Date
   */
  private calculateExpirationDate(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // default 7d

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
