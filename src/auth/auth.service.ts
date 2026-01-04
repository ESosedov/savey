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

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
  ): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified.');
    }

    return this.generateToken(user);
  }

  async googleLogin(idToken: string): Promise<{ accessToken: string }> {
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

      return this.generateToken(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private generateToken(user: User): { accessToken: string } {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }
}
