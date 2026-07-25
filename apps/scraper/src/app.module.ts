import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ScraperQueueModule } from "./scraper-queue/scraper-queue.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScraperQueueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
