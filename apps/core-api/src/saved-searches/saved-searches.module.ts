import { Module } from "@nestjs/common";
import { SavedSearchesController } from "./saved-searches.controller";
import { SavedSearchesService } from "./saved-searches.service";
import { TelegramController } from "./telegram.controller";

@Module({
  controllers: [SavedSearchesController, TelegramController],
  providers: [SavedSearchesService],
})
export class SavedSearchesModule {}
