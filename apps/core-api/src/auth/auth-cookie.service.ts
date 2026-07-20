import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CookieOptions, Response } from "express";

const REFRESH_TOKEN_COOKIE = "refresh_token";
const AUTH_COOKIE_PATH = "/auth";

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  setRefreshToken(res: Response, token: string): void {
    res.cookie(REFRESH_TOKEN_COOKIE, token, this.getCookieOptions());
  }

  clearRefreshToken(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.getClearCookieOptions());
  }

  getRefreshTokenFromRequest(cookies: Record<string, string>): string | undefined {
    return cookies[REFRESH_TOKEN_COOKIE];
  }

  private getCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>("NODE_ENV") === "production";

    return {
      httpOnly: true,
      secure:
        isProduction ||
        this.configService.get<string>("COOKIE_SECURE") === "true",
      sameSite: this.configService.get<"lax" | "strict" | "none">(
        "COOKIE_SAME_SITE",
        "lax",
      ),
      path: AUTH_COOKIE_PATH,
      maxAge: this.getRefreshTokenMaxAgeMs(),
    };
  }

  private getClearCookieOptions(): CookieOptions {
    const { maxAge: _maxAge, ...options } = this.getCookieOptions();
    return options;
  }

  private getRefreshTokenMaxAgeMs(): number {
    const expiresIn =
      this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";
    return parseDurationToMs(expiresIn);
  }
}

function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return value * multipliers[unit];
}
