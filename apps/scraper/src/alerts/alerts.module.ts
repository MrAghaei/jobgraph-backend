import { Module } from "@nestjs/common";
import { AlertDispatchService } from "./alert-dispatch.service";
import { DigestSchedulerService } from "./digest-scheduler.service";
import { EmailSenderService } from "./email-sender.service";
import { TelegramSenderService } from "./telegram-sender.service";

@Module({
  providers: [
    TelegramSenderService,
    EmailSenderService,
    AlertDispatchService,
    DigestSchedulerService,
  ],
  exports: [AlertDispatchService],
})
export class AlertsModule {}
