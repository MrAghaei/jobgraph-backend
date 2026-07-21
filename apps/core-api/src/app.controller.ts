import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "./auth/decorators/public.decorator";
import { AppService } from "./app.service";

@ApiTags("health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({
    description: "API is running",
    schema: { type: "string", example: "Hello World!" },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
