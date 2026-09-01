import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role, User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SWAGGER_ACCESS_TOKEN_SCHEME } from "../swagger/swagger.constants";
import { CreateSavedSearchDto, UpsertAlertDto } from "./dto/saved-search.dto";
import { SavedSearchesService } from "./saved-searches.service";

@ApiTags("saved-searches")
@ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
@Controller("saved-searches")
@Roles(Role.PRO, Role.ADMIN)
export class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Get()
  @ApiOperation({ summary: "List saved searches and alerts" })
  list(@CurrentUser() user: User) {
    return this.savedSearches.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: "Create a saved search" })
  create(@CurrentUser() user: User, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearches.create(user.id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a saved search" })
  remove(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.savedSearches.remove(user.id, id);
  }

  @Post(":id/alerts")
  @ApiOperation({ summary: "Create or update an alert on a saved search" })
  upsertAlert(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpsertAlertDto,
  ) {
    return this.savedSearches.upsertAlert(user.id, id, dto);
  }
}
