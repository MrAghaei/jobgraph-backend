import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ScraperQueueModule } from "./scraper-queue/scraper-queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ScraperQueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
