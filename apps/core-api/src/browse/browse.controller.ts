import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";

@Controller("jobs")
export class BrowseController {
  @Public()
  @Get()
  findAll() {
    return {
      data: [],
      message: "Free job browsing is available without authentication",
    };
  }
}
