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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Request, Response } from "express";
import { SWAGGER_ACCESS_TOKEN_SCHEME, SWAGGER_REFRESH_COOKIE_SCHEME } from "../swagger/swagger.constants";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { AuthResponseDto, UserResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { AuthResponse, IssuedTokens } from "./types/jwt-payload.type";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a new user account" })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: "Email already registered" })
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
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
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
  @ApiCookieAuth(SWAGGER_REFRESH_COOKIE_SCHEME)
  @ApiOperation({
    summary: "Refresh access token",
    description:
      "Uses the httpOnly refresh_token cookie set by login or register.",
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid refresh token" })
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
  @ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
  @ApiOperation({ summary: "Get the current authenticated user" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  me(@CurrentUser() user: User) {
    return this.authService.toPublicUser(user);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
  @ApiOperation({ summary: "Sign out and invalidate the refresh token" })
  @ApiNoContentResponse({ description: "Session cleared" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
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
