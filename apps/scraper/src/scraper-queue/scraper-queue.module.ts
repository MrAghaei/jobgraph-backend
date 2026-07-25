import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JobinjaModule } from "../jobinja/jobinja.module";
import { JobsModule } from "../jobs/jobs.module";
import {
  SCRAPER_DEFAULT_JOB_OPTIONS,
  SCRAPER_QUEUE,
} from "./constants/scraper-queue.constants";
import { ScraperProducerService } from "./producer/scraper-producer.service";
import { JobinjaWorker } from "./workers/jobinja.worker";

@Module({
  imports: [
    JobinjaModule,
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
  providers: [ScraperProducerService, JobinjaWorker],
  exports: [ScraperProducerService, BullModule],
})
export class ScraperQueueModule {}
