import {
  Body,
  Controller,
  Post,
  ValidationPipe,
  Ip,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { GetUser } from './decorators/user.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UsersService } from '../users/users.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description:
      'Login with email and password to get access and refresh tokens',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() body: { email: string; password: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.login(body.email, body.password, userAgent, ip);
  }

  @Public()
  @Post('google')
  @ApiOperation({
    summary: 'Google Login',
    description: 'Login with Google ID Token to get access and refresh tokens',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async googleLogin(
    @Body() { idToken }: GoogleLoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.googleLogin(idToken, userAgent, ip);
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verify user email address using 6-digit verification code sent via email',
  })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmail(
    @Body(ValidationPipe) verifyEmailDto: VerifyEmailDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.usersService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.code,
      userAgent,
      ip,
    );
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Resend verification email to user who has not verified their email yet',
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerification(
    @Body(ValidationPipe) resendVerificationDto: ResendVerificationDto,
  ) {
    return this.usersService.resendVerificationEmail(
      resendVerificationDto.email,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange refresh token for new access and refresh tokens',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      ip,
      userAgent,
    );
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke refresh token to invalidate session',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @GetUser('id') userId?: string,
  ): Promise<{ message: string }> {
    await this.authService.logout(refreshTokenDto.refreshToken, userId);
    return { message: 'Logged out successfully' };
  }
}
