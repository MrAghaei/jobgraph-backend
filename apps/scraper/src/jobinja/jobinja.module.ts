import { Module } from "@nestjs/common";
import { JobinjaScraperService } from "./jobinja-scraper.service";

@Module({
  providers: [JobinjaScraperService],
  exports: [JobinjaScraperService],
})
export class JobinjaModule {}
