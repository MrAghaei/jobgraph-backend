import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ScraperHttpError } from "../../jobinja/errors/scraper-http.error";
import { JobinjaScraperService } from "../../jobinja/jobinja-scraper.service";
import {
  SCRAPER_QUEUE,
  SCRAPER_RATE_LIMITER,
} from "../constants/scraper-queue.constants";
import { JobinjaScrapeJobPayload } from "../dto/scraper-job.payload";

@Processor(SCRAPER_QUEUE, {
  limiter: SCRAPER_RATE_LIMITER,
})
export class JobinjaWorker extends WorkerHost {
  private readonly logger = new Logger(JobinjaWorker.name);

  constructor(private readonly jobinjaScraper: JobinjaScraperService) {
    super();
  }

  async process(job: Job<JobinjaScrapeJobPayload>): Promise<void> {
    this.logger.log(
      `Received scrape job ${job.id} [name=${job.name}] platform=${job.data.platform} categoryUrl=${job.data.categoryUrl} pagesToScrape=${job.data.pagesToScrape}`,
    );

    try {
      const jobs = await this.jobinjaScraper.scrapeCategory(
        job.data.categoryUrl,
        job.data.pagesToScrape,
      );

      this.logger.log(
        `Finished job ${job.id}: extracted ${jobs.length} normalized jobs (no DB write)`,
      );
    } catch (error) {
      if (error instanceof ScraperHttpError && error.retryable) {
        this.logger.warn(
          `Retryable scrape error HTTP ${error.statusCode} for ${error.url}`,
        );
      }
      throw error;
    }
  }
}
