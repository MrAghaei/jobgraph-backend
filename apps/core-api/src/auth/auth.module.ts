import { DynamicModule, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleAuthController } from "./google-auth.controller";
import { GoogleAuthGuard } from "./google-auth.guard";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";

@Module({})
export class AuthModule {
  static register(): DynamicModule {
    const googleOAuthEnabled =
      Boolean(process.env.GOOGLE_CLIENT_ID) &&
      Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
      Boolean(process.env.GOOGLE_CALLBACK_URL);

    return {
      module: AuthModule,
      imports: [
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.getOrThrow<string>("JWT_SECRET"),
            signOptions: {
              expiresIn: configService.get("JWT_EXPIRES_IN") ?? "15m",
            },
          }),
        }),
      ],
      controllers: [
        AuthController,
        ...(googleOAuthEnabled ? [GoogleAuthController] : []),
      ],
      providers: [
        AuthService,
        AuthCookieService,
        JwtStrategy,
        LocalStrategy,
        ...(googleOAuthEnabled ? [GoogleStrategy, GoogleAuthGuard] : []),
      ],
      exports: [AuthService, JwtModule],
    };
  }
}
