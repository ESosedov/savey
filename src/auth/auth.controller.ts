import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UsersService } from '../users/users.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

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
    description: 'Login with email and password to get access token',
  })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('google')
  @ApiOperation({
    summary: 'Google Login',
    description: 'Login with Google ID Token to get access token',
  })
  async googleLogin(
    @Body() { idToken }: GoogleLoginDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.googleLogin(idToken);
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
  async verifyEmail(@Body(ValidationPipe) verifyEmailDto: VerifyEmailDto) {
    return this.usersService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.code,
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
}
