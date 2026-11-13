import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload of the Telegram Login Widget, passed through unchanged.
 * Every field the widget can send must be declared here: the global
 * ValidationPipe rejects unknown fields, and all of them are part of the hash.
 */
export class TelegramLoginDto {
  @ApiProperty({ example: 123456789 })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'Ivan' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  photo_url?: string;

  @ApiProperty({ description: 'Unix time of the login', example: 1763000000 })
  @IsInt()
  auth_date: number;

  @ApiProperty({ description: 'HMAC-SHA256 signature, hex' })
  @IsString()
  @IsNotEmpty()
  hash: string;
}
