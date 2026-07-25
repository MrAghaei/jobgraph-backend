import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
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

  async process(job: Job<JobinjaScrapeJobPayload>): Promise<void> {
    this.logger.log(
      `Received scrape job ${job.id} [name=${job.name}] platform=${job.data.platform} categoryUrl=${job.data.categoryUrl} pagesToScrape=${job.data.pagesToScrape}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`Finished processing job ${job.id}`);
  }
}
