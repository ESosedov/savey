import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    description: 'Login with Google user data to get access token',
  })
  async googleLogin(
    @Body() googleUserData: GoogleLoginDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.googleLogin(googleUserData);
  }
}
