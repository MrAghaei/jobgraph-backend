import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  SCRAPER_JOB_NAME,
  SCRAPER_QUEUE,
} from "../constants/scraper-queue.constants";
import {
  ScraperJobPayload,
  ScraperPlatform,
} from "../dto/scraper-job.payload";

const DEFAULT_CRON = "0 */6 * * *";

@Injectable()
export class ScraperProducerService {
  private readonly logger = new Logger(ScraperProducerService.name);

  constructor(
    @InjectQueue(SCRAPER_QUEUE) private readonly scraperQueue: Queue,
  ) {}

  async enqueueScrapeJob(payload: ScraperJobPayload): Promise<string> {
    const job = await this.scraperQueue.add(SCRAPER_JOB_NAME, payload, {
      jobId: this.buildJobId(payload),
    });

    this.logger.log(
      `Enqueued scrape job ${job.id} for ${payload.platform} (${payload.categoryKey}, maxPages=${payload.maxPages})`,
    );

    return String(job.id);
  }

  async enqueueRepeatable(
    payload: ScraperJobPayload,
    pattern = process.env.SCRAPE_CRON ?? DEFAULT_CRON,
  ): Promise<void> {
    await this.scraperQueue.add(SCRAPER_JOB_NAME, payload, {
      repeat: { pattern },
      jobId: `repeat-${payload.platform}-${payload.categoryKey}`,
    });
    this.logger.log(
      `Registered repeatable scrape ${payload.platform}/${payload.categoryKey} cron=${pattern}`,
    );
  }

  async enqueueJobinjaCategory(
    categoryKey: string,
    maxPages = 1,
  ): Promise<string> {
    return this.enqueueScrapeJob({
      platform: "jobinja",
      categoryKey,
      maxPages,
    });
  }

  async enqueuePlatform(
    platform: ScraperPlatform,
    categoryKey: string,
    maxPages = 3,
  ): Promise<string> {
    return this.enqueueScrapeJob({ platform, categoryKey, maxPages });
  }

  private buildJobId(payload: ScraperJobPayload): string {
    return `${payload.platform}-${payload.categoryKey}-p${payload.maxPages}-${Date.now()}`;
  }
}
