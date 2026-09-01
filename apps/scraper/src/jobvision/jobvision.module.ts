import { Module } from "@nestjs/common";
import { JobvisionScraperService } from "./jobvision-scraper.service";

@Module({
  providers: [JobvisionScraperService],
  exports: [JobvisionScraperService],
})
export class JobvisionModule {}
