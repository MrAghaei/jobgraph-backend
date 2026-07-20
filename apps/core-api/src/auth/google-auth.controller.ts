import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { AuthResponse, IssuedTokens } from "./types/jwt-payload.type";

@Controller("auth/google")
export class GoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Get()
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google.
  }

  @Public()
  @Get("callback")
  @UseGuards(GoogleAuthGuard)
  googleCallback(
    @Req() req: { user: User },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService
      .handleGoogleLogin(req.user)
      .then((result) => this.sendAuthResponse(res, result));
  }

  private sendAuthResponse(
    res: Response,
    result: AuthResponse & IssuedTokens,
  ): AuthResponse {
    this.authCookieService.setRefreshToken(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }
}
