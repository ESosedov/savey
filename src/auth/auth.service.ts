import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from './refresh-token.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { TokenService } from './token.service';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { TelegramLoginDto } from './dto/telegram-login.dto';

/** How old a Telegram widget login may be before it is refused. */
const TELEGRAM_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private googleAudiences: string[];

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly tokenService: TokenService,
  ) {
    const androidClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const webClientId = this.configService.get<string>('GOOGLE_CLIENT_ID_WEB');
    if (!androidClientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    // Android app and web frontend are registered as separate OAuth clients
    // (different application types in Google Cloud Console), so ID tokens can
    // carry either audience — accept both.
    this.googleAudiences = [androidClientId, webClientId].filter(
      (id): id is string => !!id,
    );
    this.googleClient = new OAuth2Client(androidClientId);
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

    return this.tokenService.generateTokens(user, deviceInfo, ipAddress);
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
        audience: this.googleAudiences,
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

      return this.tokenService.generateTokens(user, deviceInfo, ipAddress);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Telegram Login Widget. The widget hands the browser a payload signed with
   * HMAC-SHA256, keyed by SHA256(bot token); verifying it proves the payload came
   * from Telegram for this bot. Docs: https://core.telegram.org/widgets/login
   */
  async telegramLogin(
    data: TelegramLoginDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Telegram login is not configured');
    }

    const { hash, ...fields } = data;
    const checkString = Object.entries(fields)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');
    const secret = createHash('sha256').update(botToken).digest();
    const expected = createHmac('sha256', secret).update(checkString).digest();
    const received = Buffer.from(hash, 'hex');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException('Invalid Telegram login');
    }

    const age = Math.floor(Date.now() / 1000) - data.auth_date;
    if (age > TELEGRAM_AUTH_MAX_AGE_SECONDS) {
      throw new UnauthorizedException('Telegram login has expired');
    }

    const user = await this.usersService.findOrCreateTelegramUser({
      telegramId: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      picture: data.photo_url,
    });

    return this.tokenService.generateTokens(user, deviceInfo, ipAddress);
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
