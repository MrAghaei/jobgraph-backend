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
  user: SafeUser;
  accessToken: string;
}

export type SafeUser = Omit<
  import("@prisma/client").User,
  "passwordHash" | "hashedRefreshToken"
>;
