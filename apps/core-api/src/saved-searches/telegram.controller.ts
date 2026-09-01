import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role, User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { SWAGGER_ACCESS_TOKEN_SCHEME } from "../swagger/swagger.constants";
import { SavedSearchesService } from "./saved-searches.service";

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
}

@ApiTags("telegram")
@Controller("telegram")
export class TelegramController {
  constructor(
    private readonly savedSearches: SavedSearchesService,
    private readonly config: ConfigService,
  ) {}

  @Get("link")
  @Roles(Role.PRO, Role.ADMIN)
  @ApiBearerAuth(SWAGGER_ACCESS_TOKEN_SCHEME)
  @ApiOperation({ summary: "Telegram bot deep link for the current user" })
  link(@CurrentUser() user: User) {
    return this.savedSearches.getTelegramLink(
      user.id,
      this.config.get<string>("TELEGRAM_BOT_USERNAME"),
    );
  }

  @Public()
  @Post("webhook")
  @HttpCode(200)
  @ApiOperation({ summary: "Telegram bot webhook" })
  async webhook(@Body() update: TelegramUpdate) {
    const text = update.message?.text ?? "";
    const chatId = update.message?.chat?.id;
    const match = text.match(/^\/start(?:\s+(.+))?$/);
    if (!match || chatId == null) {
      return { ok: true };
    }
    const token = match[1]?.trim();
    if (!token) return { ok: true };
    await this.savedSearches.bindTelegram(token, String(chatId));
    return { ok: true };
  }
}
