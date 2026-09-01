import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

export type SafeUser = Omit<
  import("@prisma/client").User,
  "passwordHash" | "hashedRefreshToken"
> & {
  isPro: boolean;
};

export type PublicUser = SafeUser & { isPro: boolean };
