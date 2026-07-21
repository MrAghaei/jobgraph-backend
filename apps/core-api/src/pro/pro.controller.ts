import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { SWAGGER_ACCESS_TOKEN_SCHEME } from "../swagger/swagger.constants";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SafeUser } from "../auth/types/jwt-payload.type";
import { SubscriptionResponseDto } from "./dto/subscription-response.dto";

@ApiTags("pro")
@ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
@Controller("pro")
@Roles(Role.PRO, Role.ADMIN)
export class ProController {
  @Get("subscription")
  @ApiOperation({ summary: "Get pro subscription details for the current user" })
  @ApiOkResponse({ type: SubscriptionResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiForbiddenResponse({ description: "Requires PRO or ADMIN role" })
  getSubscription(@CurrentUser() user: SafeUser) {
    return {
      userId: user.id,
      role: user.role,
      status: "active",
      features: ["advanced-analytics", "saved-searches", "alerts"],
    };
  }
}
