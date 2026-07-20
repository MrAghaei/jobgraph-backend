import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SafeUser } from "../auth/types/jwt-payload.type";

@Controller("pro")
@Roles(Role.PRO, Role.ADMIN)
export class ProController {
  @Get("subscription")
  getSubscription(@CurrentUser() user: SafeUser) {
    return {
      userId: user.id,
      role: user.role,
      status: "active",
      features: ["advanced-analytics", "saved-searches", "alerts"],
    };
  }
}
