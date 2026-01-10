import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenService } from './token.service';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'super-secret'),
        signOptions: {
          expiresIn: configService.get<string | number>('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  providers: [TokenService, RefreshTokenService],
  exports: [TokenService, RefreshTokenService, JwtModule],
})
export class TokenModule {}
