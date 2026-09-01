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
  fetchOkPost,
  mapWorkType,
  nowDates,
} from "../shared/http";
import {
  jobvisionUrlTitle,
  storedCategoryForJobvision,
} from "./jobvision-targets";

const LIST_URL = "https://candidateapi.jobvision.ir/api/v1/JobPost/List";
const LISTING_URL = "https://jobvision.ir/jobs";

@Injectable()
export class JobvisionScraperService {
  private readonly logger = new Logger(JobvisionScraperService.name);
  private readonly http = createScraperHttp();

  async scrapeCategoryPage(
    categoryKey: string,
    page: number,
  ): Promise<NormalizedJob[]> {
    const urlTitle = jobvisionUrlTitle(categoryKey);
    const storedCategory = storedCategoryForJobvision(categoryKey);
    this.logger.log(
      `Jobvision listing page=${page} urlTitle=${urlTitle} category=${storedCategory}`,
    );

    try {
      const { data } = await fetchOkPost(this.http, LIST_URL, {
        page,
        pageSize: 20,
        jobCategoryUrlTitle: urlTitle,
      });
      const jobs = this.parseJsonList(data, storedCategory);
      if (jobs.length > 0) {
        this.logger.log(`Jobvision JSON returned ${jobs.length} jobs`);
        return jobs;
      }
    } catch (error) {
      this.logger.warn(
        `Jobvision JSON list failed, falling back to HTML: ${error instanceof Error ? error.message : error}`,
      );
    }

    const url =
      page <= 1
        ? `${LISTING_URL}/category/${urlTitle}`
        : `${LISTING_URL}/category/${urlTitle}?page=${page}`;
    const { data } = await fetchOk(this.http, url);
    const html = typeof data === "string" ? data : JSON.stringify(data);
    const links = this.parseListingLinks(html);
    this.logger.log(`Jobvision found ${links.length} HTML links on page ${page}`);

    const jobs: NormalizedJob[] = [];
    for (const link of links) {
      await randomDelay(800, 2000);
      try {
        const job = await this.scrapeDetail(link, storedCategory);
        if (job) jobs.push(job);
      } catch (error) {
        this.logger.warn(
          `Jobvision detail failed ${link}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
    return jobs;
  }

  private parseJsonList(
    payload: unknown,
    storedCategory: string,
  ): NormalizedJob[] {
    const root = payload as Record<string, unknown>;
    const data = (root.data ?? root) as Record<string, unknown>;
    const list = Array.isArray(data.jobPosts)
      ? data.jobPosts
      : Array.isArray(data.items)
        ? data.items
        : [];

    return list
      .map((item) => this.mapJsonJob(item, storedCategory))
      .filter((job): job is NormalizedJob => Boolean(job));
  }

  private mapJsonJob(
    item: unknown,
    storedCategory: string,
  ): NormalizedJob | null {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const title = cleanText(String(row.title ?? ""));
    const company = nestedFaName(row.company);
    if (!title || !company) return null;

    const id = row.id;
    const sourceUrl = canonicalizeSourceUrl(
      `https://jobvision.ir/jobs/${id}`,
    );
    const locationObj = row.location as Record<string, unknown> | undefined;
    const cityName = nestedFaName(locationObj?.city);
    const province = nestedFaName(locationObj?.province);
    const location = [cityName, province].filter(Boolean).join("، ");
    const dates = nowDates();
    const posted = row.activationTime ?? row.firstActivationTime;
    const postedAt = posted ? new Date(String(posted)) : new Date(dates.postedAt);
    const workType = mapWorkType(
      nestedFaName(row.workType) ??
        (isRemote(row.properties) ? "remote" : ""),
    );
    const tags = Array.isArray(row.jobCategories)
      ? (row.jobCategories as unknown[])
          .map((c) => nestedFaName(c))
          .filter((name): name is string => Boolean(name))
      : [];

    return {
      title,
      normalizedTitle: normalizeTitle(title),
      description: title,
      company: {
        name: company,
        website: null,
        logoUrl: logoFromCompany(row.company),
      },
      location: location || null,
      city: extractCity(cityName ?? location),
      salaryRange: nestedFaName(row.salary),
      experienceLevel: nestedFaName(row.seniorityLevel),
      workType,
      category: storedCategory,
      source: "jobvision",
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
      if (!href) return;
      if (!/\/jobs\/\d+/i.test(href)) return;
      try {
        links.add(
          canonicalizeSourceUrl(new URL(href, "https://jobvision.ir").toString()),
        );
      } catch {
        /* ignore */
      }
    });
    return [...links].slice(0, 30);
  }

  private async scrapeDetail(
    url: string,
    storedCategory: string,
  ): Promise<NormalizedJob | null> {
    const { data } = await fetchOk(this.http, url);
    const html = typeof data === "string" ? data : "";
    const $ = cheerio.load(html);
    const title =
      cleanText($("h1").first().text()) ??
      cleanText($("meta[property='og:title']").attr("content"));
    const companyName =
      cleanText($("[class*='company']").first().text()) ?? "unknown";
    if (!title) return null;
    const location = cleanText(
      $("[class*='location'], [class*='city']").first().text(),
    );
    const dates = nowDates();

    return {
      title,
      normalizedTitle: normalizeTitle(title),
      description:
        cleanText($("[class*='description'], article, .content").first().text()) ??
        title,
      company: { name: companyName, website: null, logoUrl: null },
      location,
      city: extractCity(location),
      salaryRange: null,
      experienceLevel: null,
      workType: mapWorkType($("body").text().slice(0, 500)),
      category: storedCategory,
      source: "jobvision",
      sourceUrl: canonicalizeSourceUrl(url),
      postedAt: dates.postedAt,
      datePosted: dates.datePosted,
      status: "ACTIVE",
      tags: [],
    };
  }
}

function nestedFaName(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return cleanText(value);
  if (typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return (
    cleanText(typeof row.nameFa === "string" ? row.nameFa : null) ??
    cleanText(typeof row.titleFa === "string" ? row.titleFa : null) ??
    cleanText(typeof row.name === "string" ? row.name : null) ??
    cleanText(typeof row.title === "string" ? row.title : null)
  );
}

function logoFromCompany(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const logo = (value as { logoUrl?: unknown }).logoUrl;
  return typeof logo === "string" ? logo : null;
}

function isRemote(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Boolean((value as { isRemote?: boolean }).isRemote);
}
