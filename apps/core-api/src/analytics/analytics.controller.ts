import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  @Public()
  @Get("basic")
  @ApiOperation({ summary: "Get basic job market analytics" })
  @ApiOkResponse({
    description: "Basic analytics summary (placeholder)",
    schema: {
      type: "object",
      properties: {
        totalJobs: { type: "number", example: 0 },
        topCategories: { type: "array", items: { type: "string" }, example: [] },
        message: {
          type: "string",
          example: "Basic analytics are available without authentication",
        },
      },
    },
  })
  getBasicAnalytics() {
    return {
      totalJobs: 0,
      topCategories: [],
      message: "Basic analytics are available without authentication",
    };
  }
}
