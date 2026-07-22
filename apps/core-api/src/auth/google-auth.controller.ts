import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Request, Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { GoogleAuthGuard } from "./google-auth.guard";
import { AuthResponse, IssuedTokens } from "./types/jwt-payload.type";

function decodeRedirectState(state: string | undefined): string {
  if (!state) {
    return "/jobs";
  }

  try {
    const redirect = Buffer.from(state, "base64url").toString("utf8");
    if (!redirect.startsWith("/") || redirect.startsWith("//")) {
      return "/jobs";
    }
    return redirect;
  } catch {
    return "/jobs";
  }
}

@ApiTags("auth-google")
@Controller("auth/google")
export class GoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
    private readonly configService: ConfigService,
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
      "Handles the redirect from Google, sets a refresh token cookie, and redirects to the frontend callback page.",
  })
  @ApiFoundResponse({ description: "Redirect to frontend auth callback" })
  async googleCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
  ) {
    const result = await this.authService.handleGoogleLogin(req.user);
    this.redirectToFrontend(res, result, decodeRedirectState(req.query.state as string | undefined));
  }

  private redirectToFrontend(
    res: Response,
    result: AuthResponse & IssuedTokens,
    redirectPath: string,
  ): void {
    this.authCookieService.setRefreshToken(res, result.refreshToken);

    const frontendOrigin = this.configService.getOrThrow<string>("CORS_ORIGIN");
    const callbackUrl = new URL("/auth/callback", frontendOrigin);
    callbackUrl.searchParams.set("redirect", redirectPath);
    callbackUrl.searchParams.set("accessToken", result.accessToken);
    callbackUrl.searchParams.set("user", encodeURIComponent(JSON.stringify(result.user)));

    res.redirect(callbackUrl.toString());
  }
}
