import { Injectable, Logger } from "@nestjs/common";
import {
  AlertCadence,
  AlertChannel,
  JobStatus,
} from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";
import { jobMatchesSearch } from "./job-match.util";
import { EmailSenderService } from "./email-sender.service";
import { TelegramSenderService } from "./telegram-sender.service";

@Injectable()
export class AlertDispatchService {
  private readonly logger = new Logger(AlertDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramSenderService,
    private readonly email: EmailSenderService,
  ) {}

  async notifyInstant(jobId: string): Promise<void> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        tags: { include: { tag: true } },
      },
    });
    if (!job) return;

    const alerts = await this.prisma.alert.findMany({
      where: {
        enabled: true,
        cadence: AlertCadence.INSTANT,
        channel: AlertChannel.TELEGRAM,
      },
      include: {
        savedSearch: {
          include: {
            user: { include: { telegramLink: true } },
          },
        },
      },
    });

    for (const alert of alerts) {
      const search = alert.savedSearch;
      if (search.user.role !== "PRO" && search.user.role !== "ADMIN") {
        continue;
      }
      const chatId = search.user.telegramLink?.chatId;
      if (!chatId) continue;

      const matches = jobMatchesSearch(
        {
          title: job.title,
          description: job.description,
          category: job.category,
          city: job.city,
          workType: job.workType,
          experienceLevel: job.experienceLevel,
          tags: job.tags.map((t) => t.tag.name),
          companyName: job.company.name,
        },
        search,
      );
      if (!matches) continue;

      const text = [
        job.title,
        job.company.name,
        [job.city, job.workType].filter(Boolean).join(" · "),
        job.sourceUrl ?? "",
      ]
        .filter(Boolean)
        .join("\n");

      await this.telegram.sendMessage(chatId, text);
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: { lastSentAt: new Date() },
      });
    }
  }

  async sendDigests(cadence: AlertCadence): Promise<void> {
    const windowMs = cadence === AlertCadence.WEEKLY ? 7 * 86400000 : 86400000;
    const since = new Date(Date.now() - windowMs);

    const alerts = await this.prisma.alert.findMany({
      where: {
        enabled: true,
        cadence,
        channel: AlertChannel.EMAIL,
      },
      include: {
        savedSearch: { include: { user: true } },
      },
    });

    for (const alert of alerts) {
      const user = alert.savedSearch.user;
      if (user.role !== "PRO" && user.role !== "ADMIN") continue;

      const jobs = await this.prisma.job.findMany({
        where: {
          status: JobStatus.ACTIVE,
          createdAt: { gte: since },
        },
        include: { company: true, tags: { include: { tag: true } } },
        orderBy: { postedAt: "desc" },
        take: 50,
      });

      const matched = jobs.filter((job) =>
        jobMatchesSearch(
          {
            title: job.title,
            description: job.description,
            category: job.category,
            city: job.city,
            workType: job.workType,
            experienceLevel: job.experienceLevel,
            tags: job.tags.map((t) => t.tag.name),
            companyName: job.company.name,
          },
          alert.savedSearch,
        ),
      );

      if (matched.length === 0) continue;

      const items = matched
        .map(
          (job) =>
            `<li><a href="${job.sourceUrl ?? "#"}">${job.title}</a> — ${job.company.name}</li>`,
        )
        .join("");

      await this.email.sendHtml(
        user.email,
        `جاب‌گراف — ${matched.length} آگهی جدید`,
        `<p>${alert.savedSearch.name}</p><ul>${items}</ul>`,
      );
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: { lastSentAt: new Date() },
      });
    }

    this.logger.log(`Digest ${cadence} processed ${alerts.length} alert(s)`);
  }
}
