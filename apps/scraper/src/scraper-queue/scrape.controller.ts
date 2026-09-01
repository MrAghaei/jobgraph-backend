import { Controller, Post, Query } from "@nestjs/common";
import { ScraperPlatform } from "./dto/scraper-job.payload";
import { ScraperProducerService } from "./producer/scraper-producer.service";

@Controller("scrape")
export class ScrapeController {
  constructor(private readonly producer: ScraperProducerService) {}

  @Post()
  enqueue(
    @Query("platform") platform = "jobinja",
    @Query("categoryKey") categoryKey = "programming",
    @Query("maxPages") maxPages = "1",
  ) {
    const pages = Math.max(1, Number(maxPages) || 1);
    return this.producer.enqueueScrapeJob({
      platform: platform as ScraperPlatform,
      categoryKey,
      maxPages: pages,
    });
  }
}
