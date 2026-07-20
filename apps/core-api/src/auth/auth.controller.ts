import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { Request, Response } from "express";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { AuthResponse, IssuedTokens } from "./types/jwt-payload.type";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Post("register")
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService
      .register(dto)
      .then((result) => this.sendAuthResponse(res, result));
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService
      .login(user)
      .then((result) => this.sendAuthResponse(res, result));
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.authCookieService.getRefreshTokenFromRequest(
      req.cookies ?? {},
    );

    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    return this.authService
      .refreshTokens(refreshToken)
      .then((result) => this.sendAuthResponse(res, result));
  }

  @Get("me")
  me(@CurrentUser() user: User) {
    const {
      passwordHash: _passwordHash,
      hashedRefreshToken: _hashedRefreshToken,
      ...safeUser
    } = user;
    return safeUser;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser("id") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    this.authCookieService.clearRefreshToken(res);
  }

  private sendAuthResponse(
    res: Response,
    result: AuthResponse & IssuedTokens,
  ): AuthResponse {
    this.authCookieService.setRefreshToken(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }
}
