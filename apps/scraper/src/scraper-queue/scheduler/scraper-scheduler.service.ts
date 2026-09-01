import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { listJobinjaCategories } from "@repo/database";
import { JOBVISION_TARGETS } from "../../jobvision/jobvision-targets";
import { ScraperProducerService } from "../producer/scraper-producer.service";

@Injectable()
export class ScraperSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ScraperSchedulerService.name);

  constructor(private readonly producer: ScraperProducerService) {}

  async onModuleInit(): Promise<void> {
    const maxPages = Number(process.env.SCRAPE_MAX_PAGES ?? 3);
    const cron = process.env.SCRAPE_CRON ?? "0 */6 * * *";

    for (const category of listJobinjaCategories()) {
      await this.producer.enqueueRepeatable(
        {
          platform: "jobinja",
          categoryKey: category.key,
          maxPages,
        },
        cron,
      );
    }

    for (const target of JOBVISION_TARGETS) {
      await this.producer.enqueueRepeatable(
        {
          platform: "jobvision",
          categoryKey: target.urlTitle,
          maxPages,
        },
        cron,
      );
    }
    await this.producer.enqueueRepeatable(
      { platform: "quera", categoryKey: "programming", maxPages },
      cron,
    );

    if (
      process.env.SCRAPE_ON_BOOT !== "false" &&
      process.env.SCRAPE_ON_START !== "false"
    ) {
      const bootPages = Number(process.env.SCRAPE_BOOT_PAGES ?? 1);
      this.logger.log(
        `SCRAPE_ON_BOOT: enqueue Jobinja, Jobvision, Quera (maxPages=${bootPages})`,
      );
      await this.producer.enqueueJobinjaCategory("programming", bootPages);
      await this.producer.enqueuePlatform(
        "jobvision",
        "developer",
        bootPages,
      );
      await this.producer.enqueuePlatform("quera", "programming", bootPages);
    }
  }
}
