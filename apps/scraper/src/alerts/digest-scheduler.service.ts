import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AlertCadence } from "@repo/database";
import { AlertDispatchService } from "./alert-dispatch.service";

@Injectable()
export class DigestSchedulerService {
  private readonly logger = new Logger(DigestSchedulerService.name);

  constructor(private readonly dispatch: AlertDispatchService) {}

  @Cron("0 8 * * *")
  async daily(): Promise<void> {
    this.logger.log("Running daily email digest");
    await this.dispatch.sendDigests(AlertCadence.DAILY);
  }

  @Cron("0 9 * * 0")
  async weekly(): Promise<void> {
    this.logger.log("Running weekly email digest");
    await this.dispatch.sendDigests(AlertCadence.WEEKLY);
  }
}
