import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    this.googleClient = new OAuth2Client(clientId);
  }

  async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified.');
    }

    return this.generateTokens(user, deviceInfo, ipAddress);
  }

  async googleLogin(
    idToken: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    try {
      // Verify the ID token with Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Extract verified user data from the token
      const googleData = {
        email: payload.email || '',
        firstName: payload.given_name || payload.name || '',
        lastName: payload.family_name || '',
        providerId: payload.sub,
        picture: payload.picture || undefined,
      };

      // Find or create user with verified data
      const user = await this.usersService.findOrCreateGoogleUser(googleData);

      return this.generateTokens(user, deviceInfo, ipAddress);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async generateTokens(
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

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<AuthResponseDto> {
    // 1. Validate token and get userId
    const userId =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    // 2. Verify user still exists and is active
    const user = await this.usersService.findOne(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 3. Rotate tokens (revoke old, create new)
    const newRefreshToken = await this.refreshTokenService.rotateRefreshToken(
      refreshToken,
      deviceInfo,
      ipAddress,
    );

    // 4. Generate new access token
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string, userId?: string): Promise<void> {
    if (userId) {
      // If we have userId from access token, verify it matches
      const tokenUserId =
        await this.refreshTokenService.validateRefreshToken(refreshToken);
      if (tokenUserId !== userId) {
        throw new UnauthorizedException('Token mismatch');
      }
    }

    await this.refreshTokenService.revokeToken(
      refreshToken,
      userId ||
        (await this.refreshTokenService.validateRefreshToken(refreshToken)),
    );
  }
}
