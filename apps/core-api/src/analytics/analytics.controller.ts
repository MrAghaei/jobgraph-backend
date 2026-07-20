import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";

@Controller("analytics")
export class AnalyticsController {
  @Public()
  @Get("basic")
  getBasicAnalytics() {
    return {
      totalJobs: 0,
      topCategories: [],
      message: "Basic analytics are available without authentication",
    };
  }
}
