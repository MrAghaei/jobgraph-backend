import { Injectable, Logger } from "@nestjs/common";
import * as cheerio from "cheerio";
import {
  canonicalizeSourceUrl,
  extractCity,
  normalizeTitle,
  cleanText,
} from "../jobinja/utils/text.util";
import { randomDelay } from "../jobinja/utils/delay.util";
import { NormalizedJob } from "../jobinja/types/normalized-job.type";
import {
  createScraperHttp,
  fetchOk,
  mapWorkType,
  nowDates,
} from "../shared/http";

const LISTING_URL = "https://quera.org/magnet/jobs";

@Injectable()
export class QueraScraperService {
  private readonly logger = new Logger(QueraScraperService.name);
  private readonly http = createScraperHttp();

  async scrapeCategoryPage(
    _categoryKey: string,
    page: number,
  ): Promise<NormalizedJob[]> {
    const url =
      page <= 1 ? LISTING_URL : `${LISTING_URL}?page=${page}`;
    this.logger.log(`Quera HTML listing ${url}`);
    const { data } = await fetchOk(this.http, url);
    const html = typeof data === "string" ? data : "";
    const fromNext = this.parseListingNextData(html);
    if (fromNext.length > 0) {
      this.logger.log(`Quera __NEXT_DATA__ returned ${fromNext.length} jobs`);
      return fromNext;
    }

    const links = this.parseListingLinks(html);
    this.logger.log(`Quera found ${links.length} HTML links on page ${page}`);
    const jobs: NormalizedJob[] = [];
    for (const link of links) {
      await randomDelay(800, 2000);
      try {
        const job = await this.scrapeDetail(link);
        if (job) jobs.push(job);
      } catch (error) {
        this.logger.warn(
          `Quera detail failed ${link}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
    return jobs;
  }

  private parseListingNextData(html: string): NormalizedJob[] {
    const json = this.readNextData(html);
    if (!json) return [];
    const edges = (
      json as {
        props?: {
          pageProps?: { jobs?: { edges?: { node?: unknown }[] } };
        };
      }
    ).props?.pageProps?.jobs?.edges;
    if (!Array.isArray(edges)) return [];
    return edges
      .map((edge) => this.mapJsonJob(edge?.node))
      .filter((job): job is NormalizedJob => Boolean(job));
  }

  private readNextData(html: string): unknown | null {
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    );
    if (!match?.[1]) return null;
    try {
      return JSON.parse(match[1]) as unknown;
    } catch {
      return null;
    }
  }

  private mapJsonJob(item: unknown): NormalizedJob | null {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = cleanText(String(row.title ?? ""));
    const companyName = nestedName(row.company);
    if (!title || !companyName) return null;

    const id = String(row.pk ?? row.id ?? row.slug ?? "");
    if (!id) return null;
    const sourceUrl = canonicalizeSourceUrl(
      `https://quera.org/magnet/jobs/${id}`,
    );
    const cityName = nestedName(row.city);
    const dates = nowDates();
    const posted = row.publish_time ?? row.created_at ?? row.published_at;
    const postedAt = posted ? new Date(String(posted)) : new Date(dates.postedAt);
    const remote = row.offers_remote === true ? "remote" : "";
    const tags = Array.isArray(row.jobtechnology_set)
      ? (row.jobtechnology_set as unknown[])
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const tech = (entry as { technology?: { name?: string } }).technology;
            return cleanText(tech?.name);
          })
          .filter((name): name is string => Boolean(name))
      : [];

    return {
      title,
      normalizedTitle: normalizeTitle(title),
      description: title,
      company: { name: companyName, website: null, logoUrl: null },
      location: cityName,
      city: extractCity(cityName),
      salaryRange:
        cleanText(typeof row.salary === "string" ? row.salary : null) ??
        cleanText(
          typeof row.salary_short === "string" ? row.salary_short : null,
        ),
      experienceLevel: cleanText(
        typeof row.level === "string" ? row.level : null,
      ),
      workType: mapWorkType(
        `${row.collaboration_type ?? ""} ${remote}`,
      ),
      category: "programming",
      source: "quera",
      sourceUrl,
      postedAt: Number.isNaN(postedAt.getTime())
        ? dates.postedAt
        : postedAt.toISOString(),
      datePosted: Number.isNaN(postedAt.getTime())
        ? dates.datePosted
        : postedAt.toISOString().slice(0, 10),
      status: "ACTIVE",
      tags,
    };
  }

  private parseListingLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || /\/category\//i.test(href)) return;
      if (!/magnet\/jobs\/[a-z0-9]+/i.test(href)) return;
      try {
        links.add(
          canonicalizeSourceUrl(new URL(href, "https://quera.org").toString()),
        );
      } catch {
        /* ignore */
      }
    });
    return [...links].slice(0, 30);
  }

  private async scrapeDetail(url: string): Promise<NormalizedJob | null> {
    const { data } = await fetchOk(this.http, url);
    const html = typeof data === "string" ? data : "";
    const fromList = this.parseListingNextData(html);
    if (fromList[0]) return fromList[0];

    const $ = cheerio.load(html);
    const title = cleanText($("h1").first().text());
    if (!title) return null;
    const dates = nowDates();
    return {
      title,
      normalizedTitle: normalizeTitle(title),
      description: cleanText($("article, main").first().text()) ?? title,
      company: {
        name: cleanText($("[class*='company']").first().text()) ?? "unknown",
        website: null,
        logoUrl: null,
      },
      location: null,
      city: null,
      salaryRange: null,
      experienceLevel: null,
      workType: null,
      category: "programming",
      source: "quera",
      sourceUrl: canonicalizeSourceUrl(url),
      postedAt: dates.postedAt,
      datePosted: dates.datePosted,
      status: "ACTIVE",
      tags: [],
    };
  }
}

function nestedName(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return cleanText(value);
  if (typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return (
    cleanText(typeof row.name === "string" ? row.name : null) ??
    cleanText(typeof row.nameFa === "string" ? row.nameFa : null) ??
    cleanText(typeof row.title === "string" ? row.title : null)
  );
}
