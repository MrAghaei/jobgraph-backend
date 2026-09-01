import { Injectable, Logger } from "@nestjs/common";
import { JobStatus, Prisma, WorkType } from "@repo/database";
import { AlertDispatchService } from "../alerts/alert-dispatch.service";
import { NormalizedJob } from "../jobinja/types/normalized-job.type";
import { PrismaService } from "../prisma/prisma.service";
import { SkillExtractionService } from "./skill-extraction.service";

@Injectable()
export class JobRepositoryService {
  private readonly logger = new Logger(JobRepositoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillExtraction: SkillExtractionService,
    private readonly alertDispatch: AlertDispatchService,
  ) {}

  /**
   * Insert or refresh a scraped job (and related company / tags).
   * @returns whether the row was inserted, plus the persisted id.
   */
  async upsertJob(
    job: NormalizedJob,
  ): Promise<{ inserted: boolean; id: string | null }> {
    const extracted = this.skillExtraction.extractFromJob(job);
    const tagNames = this.mergeTagNames(job.tags, extracted);
    const company = await this.findOrCreateCompany(job);
    const tags = await Promise.all(
      tagNames.map((name) => this.findOrCreateTag(name)),
    );
    const datePosted = new Date(job.datePosted);

    const existing = await this.prisma.job.findUnique({
      where: {
        companyId_normalizedTitle_datePosted: {
          companyId: company.id,
          normalizedTitle: job.normalizedTitle,
          datePosted,
        },
      },
      select: { id: true },
    });

    const baseData = {
      title: job.title,
      description: job.description,
      location: job.location,
      city: job.city,
      salaryRange: job.salaryRange,
      experienceLevel: job.experienceLevel,
      workType: job.workType as WorkType | null,
      category: job.category,
      source: job.source,
      sourceUrl: job.sourceUrl,
      postedAt: new Date(job.postedAt),
      status: JobStatus.ACTIVE,
      expiredAt: null,
    };

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.jobTag.deleteMany({ where: { jobId: existing.id } }),
        this.prisma.job.update({
          where: { id: existing.id },
          data: {
            ...baseData,
            tags: {
              create: tags.map((tag) => ({ tagId: tag.id })),
            },
          },
        }),
      ]);
      this.logger.debug(
        `Updated existing job: ${job.normalizedTitle} @ ${job.company.name} (${job.datePosted})`,
      );
      return { inserted: false, id: existing.id };
    }

    try {
      const created = await this.prisma.job.create({
        data: {
          ...baseData,
          normalizedTitle: job.normalizedTitle,
          companyId: company.id,
          datePosted,
          tags: {
            create: tags.map((tag) => ({ tagId: tag.id })),
          },
        },
        select: { id: true },
      });
      await this.alertDispatch.notifyInstant(created.id);
      return { inserted: true, id: created.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        this.logger.debug(
          `Race duplicate skipped: ${job.normalizedTitle} @ ${job.company.name} (${job.datePosted})`,
        );
        return { inserted: false, id: null };
      }
      throw error;
    }
  }

  private async findOrCreateCompany(job: NormalizedJob) {
    const existing = await this.prisma.company.findFirst({
      where: { name: job.company.name },
    });

    if (existing) {
      const needsUpdate =
        (job.company.website && existing.website !== job.company.website) ||
        (job.company.logoUrl && existing.logoUrl !== job.company.logoUrl);

      if (needsUpdate) {
        return this.prisma.company.update({
          where: { id: existing.id },
          data: {
            website: job.company.website ?? existing.website,
            logoUrl: job.company.logoUrl ?? existing.logoUrl,
          },
        });
      }

      return existing;
    }

    return this.prisma.company.create({
      data: {
        name: job.company.name,
        website: job.company.website,
        logoUrl: job.company.logoUrl,
      },
    });
  }

  private async findOrCreateTag(name: string) {
    const slug = this.slugify(name);

    return this.prisma.tag.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
  }

  private mergeTagNames(existing: string[], extracted: string[]): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const name of [...existing, ...extracted]) {
      const key = name.toLocaleLowerCase("en");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(name);
    }

    return merged;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]+/gu, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || Buffer.from(value).toString("base64url").slice(0, 32);
  }
}
