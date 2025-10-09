import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google user ID',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  name: string | null;

  @ApiProperty({
    description: 'User email',
    example: 'user@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User photo URL',
    example: 'https://lh3.googleusercontent.com/...',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  photo: string | null;

  @ApiProperty({
    description: 'User family name',
    example: 'Doe',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  familyName: string | null;

  @ApiProperty({
    description: 'User given name',
    example: 'John',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  givenName: string | null;
}
