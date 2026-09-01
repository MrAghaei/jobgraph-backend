import { Controller, Get, Header } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Get("basic")
  @Header("Cache-Control", "no-store, no-cache, must-revalidate")
  @ApiOperation({ summary: "Public 30-day volume and top technologies" })
  @ApiOkResponse({ description: "Cached basic analytics" })
  getBasicAnalytics() {
    return this.analytics.getBasic();
  }

  @Get("pro/cooccurrence")
  @Roles(Role.PRO, Role.ADMIN)
  @ApiOperation({ summary: "Technology co-occurrence (Pro)" })
  getCooccurrence() {
    return this.analytics.getCooccurrence();
  }

  @Get("pro/trends")
  @Roles(Role.PRO, Role.ADMIN)
  @ApiOperation({ summary: "Month-over-month tag share (Pro)" })
  getTrends() {
    return this.analytics.getTrends();
  }

  @Get("pro/salary")
  @Roles(Role.PRO, Role.ADMIN)
  @ApiOperation({ summary: "Salary distribution (Pro)" })
  getSalary() {
    return this.analytics.getSalary();
  }
}
