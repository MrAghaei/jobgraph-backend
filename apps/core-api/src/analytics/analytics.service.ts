import { Injectable } from "@nestjs/common";
import { JobStatus, Prisma } from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.module";

const BASIC_CACHE_KEY = "analytics:basic";
const COOCCUR_CACHE_KEY = "analytics:pro:cooccurrence";
const TRENDS_CACHE_KEY = "analytics:pro:trends";
const SALARY_CACHE_KEY = "analytics:pro:salary";
const TTL_SECONDS = 15 * 60;

export interface BasicAnalytics {
  activeJobsLast30Days: number;
  topTechnologies: { name: string; count: number }[];
  generatedAt: string;
}

export interface CooccurrenceRow {
  tag: string;
  companions: { name: string; percent: number }[];
}

export interface TrendPoint {
  month: string;
  tags: { name: string; share: number }[];
}

export interface SalaryBucket {
  experience: string;
  location: string;
  samples: number;
  p25: number;
  p50: number;
  p75: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getBasic(): Promise<BasicAnalytics> {
    const cached = await this.redis.getJson<BasicAnalytics>(BASIC_CACHE_KEY);
    if (
      cached &&
      (cached.activeJobsLast30Days > 0 || cached.topTechnologies.length > 0)
    ) {
      return cached;
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const [activeJobsLast30Days, grouped] = await Promise.all([
      this.prisma.job.count({
        where: {
          status: JobStatus.ACTIVE,
          OR: [{ postedAt: { gte: since } }, { createdAt: { gte: since } }],
        },
      }),
      this.prisma.jobTag.groupBy({
        by: ["tagId"],
        _count: { tagId: true },
        where: {
          job: {
            status: JobStatus.ACTIVE,
            OR: [{ postedAt: { gte: since } }, { createdAt: { gte: since } }],
          },
        },
        orderBy: { _count: { tagId: "desc" } },
        take: 10,
      }),
    ]);

    const tags = await this.prisma.tag.findMany({
      where: { id: { in: grouped.map((g) => g.tagId) } },
    });
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));

    const payload: BasicAnalytics = {
      activeJobsLast30Days,
      topTechnologies: grouped.map((g) => ({
        name: tagMap.get(g.tagId) ?? g.tagId,
        count: g._count.tagId,
      })),
      generatedAt: new Date().toISOString(),
    };

    if (payload.activeJobsLast30Days > 0 || payload.topTechnologies.length > 0) {
      await this.redis.setJson(BASIC_CACHE_KEY, payload, TTL_SECONDS);
    }

    return payload;
  }

  async invalidate(): Promise<void> {
    await this.redis.del(
      BASIC_CACHE_KEY,
      COOCCUR_CACHE_KEY,
      TRENDS_CACHE_KEY,
      SALARY_CACHE_KEY,
    );
  }

  async getCooccurrence(): Promise<{ rows: CooccurrenceRow[]; generatedAt: string }> {
    const cached = await this.redis.getJson<{
      rows: CooccurrenceRow[];
      generatedAt: string;
    }>(COOCCUR_CACHE_KEY);
    if (cached) return cached;

    const top = await this.prisma.jobTag.groupBy({
      by: ["tagId"],
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 12,
    });
    const topIds = top.map((t) => t.tagId);
    if (topIds.length === 0) {
      const empty = { rows: [], generatedAt: new Date().toISOString() };
      await this.redis.setJson(COOCCUR_CACHE_KEY, empty, TTL_SECONDS);
      return empty;
    }

    const tags = await this.prisma.tag.findMany({ where: { id: { in: topIds } } });
    const nameById = new Map(tags.map((t) => [t.id, t.name]));

    const pairs = await this.prisma.$queryRaw<
      { a: string; b: string; together: bigint; total_a: bigint }[]
    >(Prisma.sql`
      SELECT a."tagId" AS a, b."tagId" AS b, COUNT(*)::bigint AS together,
             (SELECT COUNT(*) FROM "JobTag" t WHERE t."tagId" = a."tagId")::bigint AS total_a
      FROM "JobTag" a
      JOIN "JobTag" b ON a."jobId" = b."jobId" AND a."tagId" <> b."tagId"
      WHERE a."tagId" IN (${Prisma.join(topIds)})
        AND b."tagId" IN (${Prisma.join(topIds)})
      GROUP BY a."tagId", b."tagId"
    `);

    const rows: CooccurrenceRow[] = topIds.map((id) => {
      const companions = pairs
        .filter((p) => p.a === id)
        .map((p) => ({
          name: nameById.get(p.b) ?? p.b,
          percent:
            Number(p.total_a) === 0
              ? 0
              : Math.round((Number(p.together) / Number(p.total_a)) * 100),
        }))
        .sort((x, y) => y.percent - x.percent)
        .slice(0, 8);
      return { tag: nameById.get(id) ?? id, companions };
    });

    const payload = { rows, generatedAt: new Date().toISOString() };
    await this.redis.setJson(COOCCUR_CACHE_KEY, payload, TTL_SECONDS);
    return payload;
  }

  async getTrends(): Promise<{ months: TrendPoint[]; generatedAt: string }> {
    const cached = await this.redis.getJson<{
      months: TrendPoint[];
      generatedAt: string;
    }>(TRENDS_CACHE_KEY);
    if (cached) return cached;

    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 6);

    const rows = await this.prisma.$queryRaw<
      { month: Date; tag: string; count: bigint; total: bigint }[]
    >`
      SELECT date_trunc('month', j."postedAt") AS month,
             t.name AS tag,
             COUNT(*)::bigint AS count,
             SUM(COUNT(*)) OVER (PARTITION BY date_trunc('month', j."postedAt"))::bigint AS total
      FROM "JobTag" jt
      JOIN "Job" j ON j.id = jt."jobId"
      JOIN "Tag" t ON t.id = jt."tagId"
      WHERE j."postedAt" >= ${since}
      GROUP BY 1, 2
    `;

    const byMonth = new Map<string, { name: string; share: number }[]>();
    for (const row of rows) {
      const key = row.month.toISOString().slice(0, 7);
      const share =
        Number(row.total) === 0
          ? 0
          : Math.round((Number(row.count) / Number(row.total)) * 1000) / 10;
      const list = byMonth.get(key) ?? [];
      list.push({ name: row.tag, share });
      byMonth.set(key, list);
    }

    const months: TrendPoint[] = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, tags]) => ({
        month,
        tags: tags.sort((a, b) => b.share - a.share).slice(0, 8),
      }));

    const payload = { months, generatedAt: new Date().toISOString() };
    await this.redis.setJson(TRENDS_CACHE_KEY, payload, TTL_SECONDS);
    return payload;
  }

  async getSalary(): Promise<{ buckets: SalaryBucket[]; generatedAt: string }> {
    const cached = await this.redis.getJson<{
      buckets: SalaryBucket[];
      generatedAt: string;
    }>(SALARY_CACHE_KEY);
    if (cached) return cached;

    const jobs = await this.prisma.job.findMany({
      where: { salaryRange: { not: null } },
      select: {
        salaryRange: true,
        experienceLevel: true,
        city: true,
      },
    });

    const grouped = new Map<string, number[]>();
    for (const job of jobs) {
      const mid = parseSalaryMidpoint(job.salaryRange);
      if (mid == null) continue;
      const key = `${job.experienceLevel ?? "نامشخص"}|${job.city ?? "نامشخص"}`;
      const list = grouped.get(key) ?? [];
      list.push(mid);
      grouped.set(key, list);
    }

    const buckets: SalaryBucket[] = [...grouped.entries()]
      .filter(([, values]) => values.length >= 3)
      .map(([key, values]) => {
        const [experience, location] = key.split("|");
        const sorted = values.sort((a, b) => a - b);
        return {
          experience,
          location,
          samples: sorted.length,
          p25: percentile(sorted, 0.25),
          p50: percentile(sorted, 0.5),
          p75: percentile(sorted, 0.75),
        };
      })
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 24);

    const payload = { buckets, generatedAt: new Date().toISOString() };
    await this.redis.setJson(SALARY_CACHE_KEY, payload, TTL_SECONDS);
    return payload;
  }
}

function parseSalaryMidpoint(raw: string | null): number | null {
  if (!raw) return null;
  const ascii = raw.replace(/[۰-۹]/g, (d) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)),
  );
  const nums = [...ascii.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const plausible = nums.filter((n) => n >= 5 && n <= 500);
  if (plausible.length === 0) return null;
  return plausible.reduce((a, b) => a + b, 0) / plausible.length;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return Math.round(sorted[idx] * 10) / 10;
}
