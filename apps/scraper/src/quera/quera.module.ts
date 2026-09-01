import { Module } from "@nestjs/common";
import { QueraScraperService } from "./quera-scraper.service";

@Module({
  providers: [QueraScraperService],
  exports: [QueraScraperService],
})
export class QueraModule {}
