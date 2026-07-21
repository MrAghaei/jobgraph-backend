import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("jobs")
@Controller("jobs")
export class BrowseController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Browse jobs without authentication" })
  @ApiOkResponse({
    description: "Paginated job list (placeholder)",
    schema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object" }, example: [] },
        message: {
          type: "string",
          example: "Free job browsing is available without authentication",
        },
      },
    },
  })
  findAll() {
    return {
      data: [],
      message: "Free job browsing is available without authentication",
    };
  }
}
