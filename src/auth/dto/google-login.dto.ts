import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID Token received from Google OAuth',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjI3ZmE...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
