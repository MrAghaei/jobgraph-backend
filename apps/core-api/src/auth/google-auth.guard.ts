import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";

function sanitizeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/jobs";
  }
  return value;
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const redirect = request.query.redirect as string | undefined;

    if (!redirect) {
      return {};
    }

    return {
      state: Buffer.from(sanitizeRedirect(redirect)).toString("base64url"),
    };
  }
}
