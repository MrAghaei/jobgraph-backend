import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { getJobinjaCategory } from "../../jobinja/config/jobinja-categories";
import { JobinjaScraperService } from "../../jobinja/jobinja-scraper.service";
import { JobvisionScraperService } from "../../jobvision/jobvision-scraper.service";
import { storedCategoryForJobvision } from "../../jobvision/jobvision-targets";
import { QueraScraperService } from "../../quera/quera-scraper.service";
import { JobLifecycleService } from "../../jobs/job-lifecycle.service";
import { JobRepositoryService } from "../../jobs/job-repository.service";
import { NormalizedJob } from "../../jobinja/types/normalized-job.type";
import { ANALYTICS_CACHE_KEYS } from "../../analytics/analytics-cache.constants";
import {
  SCRAPER_QUEUE,
  SCRAPER_RATE_LIMITER,
} from "../constants/scraper-queue.constants";
import { ScraperJobPayload } from "../dto/scraper-job.payload";
import { ScraperHttpError } from "../../jobinja/errors/scraper-http.error";

const PAGE_DELAY_MS = 1500;

@Processor(SCRAPER_QUEUE, {
  limiter: SCRAPER_RATE_LIMITER,
})
export class ScraperWorker extends WorkerHost {
  private readonly logger = new Logger(ScraperWorker.name);

  constructor(
    private readonly jobinjaScraper: JobinjaScraperService,
    private readonly jobvisionScraper: JobvisionScraperService,
    private readonly queraScraper: QueraScraperService,
    private readonly jobRepository: JobRepositoryService,
    private readonly jobLifecycle: JobLifecycleService,
    @InjectQueue(SCRAPER_QUEUE) private readonly scraperQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ScraperJobPayload>): Promise<void> {
    const { platform, categoryKey, maxPages } = job.data;
    this.logger.log(
      `Scrape ${job.id} platform=${platform} category=${categoryKey} maxPages=${maxPages}`,
    );

    let insertedTotal = 0;
    let duplicateTotal = 0;

    try {
      for (let page = 1; page <= maxPages; page++) {
        const scraped = await this.scrapePage(platform, categoryKey, page);
        let pageInserted = 0;
        let pageDuplicates = 0;

        for (const scrapedJob of scraped) {
          scrapedJob.category = this.storedCategory(platform, categoryKey);
          const result = await this.jobRepository.upsertJob(scrapedJob);
          if (result.inserted) pageInserted += 1;
          else pageDuplicates += 1;
        }

        insertedTotal += pageInserted;
        duplicateTotal += pageDuplicates;
        this.logger.log(
          `Job ${job.id}: page ${page} inserted=${pageInserted} duplicates=${pageDuplicates}`,
        );

        if (scraped.length > 0 && pageInserted === 0) {
          this.logger.log(`Job ${job.id}: kill switch on page ${page}`);
          break;
        }
        if (scraped.length === 0) break;

        await new Promise<void>((resolve) =>
          setTimeout(resolve, PAGE_DELAY_MS),
        );
      }

      const expired = await this.jobLifecycle.expireStaleJobs();
      await this.invalidateAnalyticsCache();
      this.logger.log(
        `Finished ${job.id}: inserted=${insertedTotal} updated=${duplicateTotal} expired=${expired}`,
      );
    } catch (error) {
      if (error instanceof ScraperHttpError && error.retryable) {
        this.logger.warn(
          `Retryable scrape error HTTP ${error.statusCode} for ${error.url}`,
        );
      } else {
        this.logger.error(
          `Scrape job ${job.id} failed: ${error instanceof Error ? error.message : error}`,
        );
      }
      throw error;
    }
  }

  private scrapePage(
    platform: ScraperJobPayload["platform"],
    categoryKey: string,
    page: number,
  ): Promise<NormalizedJob[]> {
    if (platform === "jobinja") {
      const category = getJobinjaCategory(categoryKey);
      return this.jobinjaScraper.scrapeCategoryPage(category.url, page);
    }
    if (platform === "jobvision") {
      return this.jobvisionScraper.scrapeCategoryPage(categoryKey, page);
    }
    return this.queraScraper.scrapeCategoryPage(categoryKey, page);
  }

  private storedCategory(
    platform: ScraperJobPayload["platform"],
    categoryKey: string,
  ): string {
    if (platform === "jobinja") return categoryKey;
    if (platform === "jobvision") return storedCategoryForJobvision(categoryKey);
    return "programming";
  }

  private async invalidateAnalyticsCache(): Promise<void> {
    try {
      const redis = await this.scraperQueue.client;
      await redis.del(...ANALYTICS_CACHE_KEYS);
    } catch (error) {
      this.logger.warn(
        `Could not invalidate analytics cache: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
