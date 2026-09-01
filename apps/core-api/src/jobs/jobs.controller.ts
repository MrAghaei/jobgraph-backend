import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import {
  JobDetailDto,
  JobFiltersDto,
  PaginatedJobsDto,
} from "./dto/job-response.dto";
import { ListJobsQueryDto } from "./dto/list-jobs-query.dto";
import { JobsService } from "./jobs.service";

@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "List jobs with optional category, city, and search filters",
  })
  @ApiOkResponse({ type: PaginatedJobsDto })
  findAll(@Query() query: ListJobsQueryDto): Promise<PaginatedJobsDto> {
    return this.jobsService.findAll(query);
  }

  @Public()
  @Get("filters")
  @ApiOperation({
    summary: "Get available category and city filter options",
  })
  @ApiOkResponse({ type: JobFiltersDto })
  getFilters(): Promise<JobFiltersDto> {
    return this.jobsService.getFilters();
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get a single job by id" })
  @ApiOkResponse({ type: JobDetailDto })
  @ApiNotFoundResponse({ description: "Job not found" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<JobDetailDto> {
    return this.jobsService.findOne(id);
  }
}
