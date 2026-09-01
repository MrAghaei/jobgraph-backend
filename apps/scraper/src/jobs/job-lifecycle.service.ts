import { Injectable, Logger } from "@nestjs/common";
import { JobStatus } from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";

/** Jobs older than this many days (by `datePosted`) are marked expired. */
const DEFAULT_MAX_ACTIVE_AGE_DAYS = 45;

@Injectable()
export class JobLifecycleService {
  private readonly logger = new Logger(JobLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mark stale ACTIVE jobs as EXPIRED.
   * Intended to run after a scrape batch completes.
   */
  async expireStaleJobs(
    maxActiveAgeDays = DEFAULT_MAX_ACTIVE_AGE_DAYS,
  ): Promise<number> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - maxActiveAgeDays);
    cutoff.setUTCHours(0, 0, 0, 0);

    const result = await this.prisma.job.updateMany({
      where: {
        status: JobStatus.ACTIVE,
        datePosted: { lt: cutoff },
      },
      data: {
        status: JobStatus.EXPIRED,
        expiredAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Expired ${result.count} job(s) with datePosted before ${cutoff.toISOString().slice(0, 10)}`,
      );
    }

    return result.count;
  }
}
