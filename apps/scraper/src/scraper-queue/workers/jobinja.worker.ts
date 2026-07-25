import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import {
  buildCategoryPageUrl,
  getJobinjaCategory,
} from "../../jobinja/config/jobinja-categories";
import { ScraperHttpError } from "../../jobinja/errors/scraper-http.error";
import { JobinjaScraperService } from "../../jobinja/jobinja-scraper.service";
import { JobRepositoryService } from "../../jobs/job-repository.service";
import {
  SCRAPER_QUEUE,
  SCRAPER_RATE_LIMITER,
} from "../constants/scraper-queue.constants";
import { JobinjaScrapeJobPayload } from "../dto/scraper-job.payload";

const PAGE_DELAY_MS = 1500;

@Processor(SCRAPER_QUEUE, {
  limiter: SCRAPER_RATE_LIMITER,
})
export class JobinjaWorker extends WorkerHost {
  private readonly logger = new Logger(JobinjaWorker.name);

  constructor(
    private readonly jobinjaScraper: JobinjaScraperService,
    private readonly jobRepository: JobRepositoryService,
  ) {
    super();
  }

  async process(job: Job<JobinjaScrapeJobPayload>): Promise<void> {
    const { categoryKey, maxPages } = job.data;
    const category = getJobinjaCategory(categoryKey);

    this.logger.log(
      `Received scrape job ${job.id} [name=${job.name}] platform=${job.data.platform} categoryKey=${categoryKey} maxPages=${maxPages}`,
    );

    let insertedTotal = 0;
    let duplicateTotal = 0;

    try {
      for (let page = 1; page <= maxPages; page++) {
        const listingUrl = buildCategoryPageUrl(category.url, page);
        this.logger.log(
          `Job ${job.id}: scraping page ${page}/${maxPages} → ${listingUrl}`,
        );

        const scraped = await this.jobinjaScraper.scrapeCategoryPage(
          category.url,
          page,
        );

        let pageInserted = 0;
        let pageDuplicates = 0;

        for (const scrapedJob of scraped) {
          scrapedJob.category = categoryKey;
          const inserted = await this.jobRepository.upsertJob(scrapedJob);
          if (inserted) {
            pageInserted += 1;
          } else {
            pageDuplicates += 1;
          }
        }

        insertedTotal += pageInserted;
        duplicateTotal += pageDuplicates;

        this.logger.log(
          `Job ${job.id}: page ${page} done — inserted=${pageInserted} duplicates=${pageDuplicates}`,
        );

        // Kill switch: entire page already in DB → we hit yesterday's scrape frontier.
        if (scraped.length > 0 && pageInserted === 0) {
          this.logger.log(
            `Job ${job.id}: kill switch — page ${page} was all duplicates (${pageDuplicates}). Stopping pagination early.`,
          );
          break;
        }

        if (scraped.length === 0) {
          this.logger.log(
            `Job ${job.id}: no jobs on page ${page}; stopping pagination.`,
          );
          break;
        }

        // Rate limit between listing pages to reduce IP ban risk.
        await new Promise<void>((resolve) =>
          setTimeout(resolve, PAGE_DELAY_MS),
        );
      }

      this.logger.log(
        `Finished job ${job.id}: inserted=${insertedTotal} duplicates=${duplicateTotal}`,
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
