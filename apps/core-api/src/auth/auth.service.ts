import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import * as argon2 from "argon2";
import { Profile } from "passport-google-oauth20";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import {
  AuthResponse,
  IssuedTokens,
  JwtPayload,
  SafeUser,
} from "./types/jwt-payload.type";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse & IssuedTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
      },
    });

    const tokens = await this.issueTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      return null;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    return isValid ? user : null;
  }

  async login(user: User): Promise<AuthResponse & IssuedTokens> {
    const tokens = await this.issueTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<AuthResponse & IssuedTokens> {
    const refreshSecret = this.configService.getOrThrow<string>(
      "JWT_REFRESH_SECRET",
    );

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const isValid = await argon2.verify(
      user.hashedRefreshToken,
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.issueTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async validateGoogleUser(profile: Profile): Promise<User> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;

    if (!email) {
      throw new UnauthorizedException("Google account has no email");
    }

    const existingByGoogle = await this.prisma.user.findFirst({
      where: { googleId },
    });

    if (existingByGoogle) {
      return existingByGoogle;
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId },
      });
    }

    return this.prisma.user.create({
      data: {
        email,
        googleId,
      },
    });
  }

  async handleGoogleLogin(user: User): Promise<AuthResponse & IssuedTokens> {
    const tokens = await this.issueTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  isGoogleOAuthEnabled(): boolean {
    return Boolean(
      this.configService.get<string>("GOOGLE_CLIENT_ID") &&
        this.configService.get<string>("GOOGLE_CLIENT_SECRET") &&
        this.configService.get<string>("GOOGLE_CALLBACK_URL"),
    );
  }

  private async issueTokens(user: User): Promise<IssuedTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRES_IN") ?? "7d",
    });

    const hashedRefreshToken = await argon2.hash(refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, hashedRefreshToken: _hashedRefreshToken, ...safeUser } =
      user;
    return safeUser;
  }
}
