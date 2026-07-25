import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { JobinjaCategoryKey } from "../../jobinja/config/jobinja-categories";
import {
  SCRAPER_JOB_NAME,
  SCRAPER_QUEUE,
} from "../constants/scraper-queue.constants";
import { ScraperJobPayload } from "../dto/scraper-job.payload";

@Injectable()
export class ScraperProducerService {
  private readonly logger = new Logger(ScraperProducerService.name);

  constructor(
    @InjectQueue(SCRAPER_QUEUE) private readonly scraperQueue: Queue,
  ) {}

  /**
   * Enqueues a scrape job. Intended to be called from a Cron trigger.
   */
  async enqueueScrapeJob(payload: ScraperJobPayload): Promise<string> {
    const job = await this.scraperQueue.add(SCRAPER_JOB_NAME, payload, {
      jobId: this.buildJobId(payload),
    });

    this.logger.log(
      `Enqueued scrape job ${job.id} for ${payload.platform} (${payload.categoryKey}, maxPages=${payload.maxPages})`,
    );

    return String(job.id);
  }

  /** Enqueue by registry key (e.g. `"programming"`). */
  async enqueueJobinjaCategory(
    categoryKey: JobinjaCategoryKey,
    maxPages = 1,
  ): Promise<string> {
    return this.enqueueScrapeJob({
      platform: "jobinja",
      categoryKey,
      maxPages,
    });
  }

  private buildJobId(payload: ScraperJobPayload): string {
    return `${payload.platform}:${payload.categoryKey}:p${payload.maxPages}`;
  }
}
