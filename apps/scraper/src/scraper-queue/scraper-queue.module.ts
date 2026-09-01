import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JobinjaModule } from "../jobinja/jobinja.module";
import { JobvisionModule } from "../jobvision/jobvision.module";
import { JobsModule } from "../jobs/jobs.module";
import { QueraModule } from "../quera/quera.module";
import {
  SCRAPER_DEFAULT_JOB_OPTIONS,
  SCRAPER_QUEUE,
} from "./constants/scraper-queue.constants";
import { ScrapeController } from "./scrape.controller";
import { ScraperProducerService } from "./producer/scraper-producer.service";
import { ScraperSchedulerService } from "./scheduler/scraper-scheduler.service";
import { ScraperWorker } from "./workers/scraper.worker";

@Module({
  imports: [
    JobinjaModule,
    JobvisionModule,
    QueraModule,
    JobsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST", "localhost"),
          port: Number(config.get("REDIS_PORT", 6379)),
          password: config.get<string>("REDIS_PASSWORD") || undefined,
        },
        defaultJobOptions: SCRAPER_DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue({
      name: SCRAPER_QUEUE,
    }),
  ],
  controllers: [ScrapeController],
  providers: [ScraperProducerService, ScraperWorker, ScraperSchedulerService],
  exports: [ScraperProducerService, BullModule],
})
export class ScraperQueueModule {}
