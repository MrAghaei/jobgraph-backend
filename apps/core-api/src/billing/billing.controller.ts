import { Controller, Get, Post, Query, Res } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role, User } from "@prisma/client";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SWAGGER_ACCESS_TOKEN_SCHEME } from "../swagger/swagger.constants";
import { BillingService } from "./billing.service";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("subscription")
  @ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
  @ApiOperation({ summary: "Current subscription for the signed-in user" })
  getSubscription(@CurrentUser() user: User) {
    return this.billing.getCurrent(user.id);
  }

  @Post("zarinpal/request")
  @ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
  @ApiOperation({ summary: "Start a Zarinpal payment for Pro" })
  requestPayment(@CurrentUser() user: User) {
    return this.billing.requestPayment(user.id, user.email);
  }

  @Public()
  @Get("zarinpal/callback")
  @ApiOperation({ summary: "Zarinpal payment callback" })
  async callback(
    @Query("Authority") authority: string,
    @Query("Status") status: string,
    @Res() res: Response,
  ) {
    const redirect = await this.billing.handleCallback(authority, status);
    return res.redirect(redirect);
  }

  @Get("pro-status")
  @Roles(Role.PRO, Role.ADMIN)
  @ApiOkResponse({ description: "Confirms Pro access" })
  pingPro(@CurrentUser() user: User) {
    return { ok: true, userId: user.id };
  }
}
