import { Injectable, Logger } from "@nestjs/common";
import { Prisma, WorkType, JobStatus } from "@repo/database";
import { NormalizedJob } from "../jobinja/types/normalized-job.type";
import { PrismaService } from "../prisma/prisma.service";
import { SkillExtractionService } from "./skill-extraction.service";

@Injectable()
export class JobRepositoryService {
  private readonly logger = new Logger(JobRepositoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly skillExtraction: SkillExtractionService,
  ) {}

  /**
   * Insert a scraped job (and related company / tags).
   * @returns `true` if inserted, `false` if skipped due to unique constraint (P2002).
   */
  async upsertJob(job: NormalizedJob): Promise<boolean> {
    const extracted = this.skillExtraction.extractFromJob(job);
    const tagNames = this.mergeTagNames(job.tags, extracted);

    try {
      const company = await this.findOrCreateCompany(job);

      const tags = await Promise.all(
        tagNames.map((name) => this.findOrCreateTag(name)),
      );

      await this.prisma.job.create({
        data: {
          title: job.title,
          normalizedTitle: job.normalizedTitle,
          description: job.description,
          companyId: company.id,
          location: job.location,
          salaryRange: job.salaryRange,
          experienceLevel: job.experienceLevel,
          workType: job.workType as WorkType | null,
          category: job.category,
          source: job.source,
          sourceUrl: job.sourceUrl,
          postedAt: new Date(job.postedAt),
          datePosted: new Date(job.datePosted),
          status: job.status as JobStatus,
          tags: {
            create: tags.map((tag) => ({
              tagId: tag.id,
            })),
          },
        },
      });

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        this.logger.debug(
          `Duplicate job skipped: ${job.normalizedTitle} @ ${job.company.name} (${job.datePosted})`,
        );
        return false;
      }
      throw error;
    }
  }

  private async findOrCreateCompany(job: NormalizedJob) {
    const existing = await this.prisma.company.findFirst({
      where: { name: job.company.name },
    });

    if (existing) {
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
