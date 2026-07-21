import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { AuthResponse, IssuedTokens } from "./types/jwt-payload.type";

@ApiTags("auth-google")
@Controller("auth/google")
export class GoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Get()
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: "Initiate Google OAuth sign-in",
    description: "Redirects the browser to the Google consent screen.",
  })
  @ApiFoundResponse({ description: "Redirect to Google OAuth" })
  googleAuth() {
    // Passport redirects to Google.
  }

  @Public()
  @Get("callback")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: "Google OAuth callback",
    description:
      "Handles the redirect from Google and returns an auth response with a refresh token cookie.",
  })
  @ApiOkResponse({ type: AuthResponseDto })
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
