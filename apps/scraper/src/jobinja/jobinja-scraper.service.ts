import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance, isAxiosError } from "axios";
import * as cheerio from "cheerio";
import {
  buildCategoryPageUrl,
  getJobinjaCategory,
} from "./config/jobinja-categories";
import { ScraperHttpError } from "./errors/scraper-http.error";
import { ScraperMapper } from "./mapper/scraper.mapper";
import { NormalizedJob } from "./types/normalized-job.type";
import { RawJobinjaJob } from "./types/raw-job.type";
import { randomDelay } from "./utils/delay.util";
import { canonicalizeSourceUrl, cleanText } from "./utils/text.util";

const INFO_LABELS = {
  category: "دسته‌بندی شغلی",
  location: "موقعیت مکانی",
  employmentType: "نوع همکاری",
  experience: "حداقل سابقه کار",
  salary: "حقوق",
  skills: "مهارت‌های مورد نیاز",
} as const;

@Injectable()
export class JobinjaScraperService {
  private readonly logger = new Logger(JobinjaScraperService.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      timeout: 30_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      // Do not throw on 4xx so we can map 403/429 explicitly.
      validateStatus: () => true,
    });
  }

  /**
   * Fetch a job detail page and extract raw fields.
   * Returns JSON only — no database side effects.
   */
  async scrapePage(url: string): Promise<RawJobinjaJob> {
    const html = await this.fetchHtml(url);
    return this.parseJobDetail(html, url);
  }

  /**
   * Extract absolute job detail URLs from a category listing page.
   */
  async scrapeCategoryListing(url: string): Promise<string[]> {
    const html = await this.fetchHtml(url);
    return this.parseJobLinks(html);
  }

  /**
   * Scrape a single category listing page (by page number), then each job detail.
   * Applies a random 1–3s delay between detail requests (anti-ban).
   */
  async scrapeCategoryPage(
    categoryUrl: string,
    page: number,
  ): Promise<NormalizedJob[]> {
    const listingUrl = buildCategoryPageUrl(categoryUrl, page);
    this.logger.log(`Scraping category listing page ${page}: ${listingUrl}`);

    const links = await this.scrapeCategoryListing(listingUrl);
    this.logger.log(`Found ${links.length} job links on page ${page}`);

    const jobs: NormalizedJob[] = [];
    for (const link of links) {
      await randomDelay(1000, 3000);
      const raw = await this.scrapePage(link);
      jobs.push(ScraperMapper.toNormalizedJob(raw));
    }

    return jobs;
  }

  /**
   * Scrape one or more category listing pages, then each job detail.
   * Applies a random 1–3s delay between page / detail requests (anti-ban).
   */
  async scrapeCategory(
    categoryKeyOrUrl: string,
    pagesToScrape = 1,
  ): Promise<NormalizedJob[]> {
    const categoryUrl = this.resolveCategoryUrl(categoryKeyOrUrl);
    const pageCount = Math.max(1, pagesToScrape);
    const jobs: NormalizedJob[] = [];

    for (let page = 1; page <= pageCount; page++) {
      if (page > 1) {
        await randomDelay(1000, 3000);
      }

      const pageJobs = await this.scrapeCategoryPage(categoryUrl, page);
      jobs.push(...pageJobs);
    }

    return jobs;
  }

  private resolveCategoryUrl(categoryKeyOrUrl: string): string {
    if (/^https?:\/\//i.test(categoryKeyOrUrl)) {
      return categoryKeyOrUrl;
    }
    return getJobinjaCategory(categoryKeyOrUrl).url;
  }

  private async fetchHtml(url: string): Promise<string> {
    try {
      const response = await this.http.get<string>(url, {
        responseType: "text",
      });

      if (response.status === 429 || response.status === 403) {
        throw new ScraperHttpError(response.status, url);
      }

      if (response.status < 200 || response.status >= 300) {
        throw new ScraperHttpError(
          response.status,
          url,
          `Unexpected HTTP ${response.status} for ${url}`,
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof ScraperHttpError) {
        throw error;
      }

      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 429 || status === 403) {
          throw new ScraperHttpError(status, url);
        }
        throw new Error(`Network error fetching ${url}: ${error.message}`, {
          cause: error,
        });
      }

      throw error;
    }
  }

  private parseJobLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    const seen = new Set<string>();

    $(".c-jobListView__titleLink").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const canonical = canonicalizeSourceUrl(href);
      if (seen.has(canonical)) return;
      seen.add(canonical);
      links.push(canonical);
    });

    return links;
  }

  private parseJobDetail(html: string, sourceUrl: string): RawJobinjaJob {
    const $ = cheerio.load(html);
    const info = this.parseInfoBox($);
    const jsonLd = this.parseJobPostingJsonLd($);

    const titleFromDom = cleanText(
      $(".c-jobView__titleText h1").first().text(),
    );
    const titleFromLd = cleanText(jsonLd?.title ?? null);

    const companyName =
      cleanText($(".c-companyHeader__name").first().text()) ??
      cleanText(jsonLd?.hiringOrganization?.name ?? null);

    const companyWebsite =
      cleanText(
        $(".c-companyHeader__metaItem a[href^='http']").first().attr("href") ??
          null,
      ) ?? cleanText(jsonLd?.hiringOrganization?.sameAs ?? null);

    const companyLogoUrl =
      cleanText($(".c-companyHeader__logoImage").first().attr("src") ?? null) ??
      cleanText(jsonLd?.hiringOrganization?.logo ?? null);

    const descriptionHtml = $(".s-jobDesc").first().html();
    const descriptionText =
      cleanText($(".s-jobDesc").first().text()) ??
      cleanText(
        descriptionHtml ? cheerio.load(descriptionHtml).text() : null,
      ) ??
      cleanText(
        jsonLd?.description ? cheerio.load(jsonLd.description).text() : null,
      );

    return {
      title: titleFromLd ?? titleFromDom,
      companyName,
      companyWebsite,
      companyLogoUrl,
      location: info.location,
      salaryRange: info.salary ?? this.formatSalaryFromJsonLd(jsonLd),
      experienceLevel: info.experience,
      employmentType: info.employmentType,
      category: info.category,
      description: descriptionText,
      skills: info.skills,
      datePosted: cleanText(jsonLd?.datePosted ?? null),
      relativePostedLabel: null,
      jobLocationType: cleanText(jsonLd?.jobLocationType ?? null),
      sourceUrl,
    };
  }

  private parseInfoBox($: ReturnType<typeof cheerio.load>): {
    category: string | null;
    location: string | null;
    employmentType: string | null;
    experience: string | null;
    salary: string | null;
    skills: string[];
  } {
    const values = new Map<string, string[]>();

    $(".c-infoBox__item").each((_, el) => {
      const label = cleanText($(el).find(".c-infoBox__itemTitle").text());
      if (!label) return;

      const tags = $(el)
        .find(".tags .black, .tags span")
        .map((__, span) => cleanText($(span).text()))
        .get()
        .filter((v): v is string => Boolean(v));

      if (tags.length > 0) {
        values.set(label, tags);
        return;
      }

      const clone = $(el).clone();
      clone.find(".c-infoBox__itemTitle").remove();
      const fallback = cleanText(clone.text());
      values.set(label, fallback ? [fallback] : []);
    });

    const valueOf = (label: string): string | null => {
      const parts = values.get(label);
      if (!parts || parts.length === 0) return null;
      return parts.join("، ");
    };

    return {
      category: valueOf(INFO_LABELS.category),
      location: valueOf(INFO_LABELS.location),
      employmentType: valueOf(INFO_LABELS.employmentType),
      experience: valueOf(INFO_LABELS.experience),
      salary: valueOf(INFO_LABELS.salary),
      skills: values.get(INFO_LABELS.skills) ?? [],
    };
  }

  private parseJobPostingJsonLd(
    $: ReturnType<typeof cheerio.load>,
  ): JobPostingLd | null {
    let found: JobPostingLd | null = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      if (found) return;
      const raw = $(el).html();
      if (!raw) return;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed as JobPostingLd)["@type"] === "JobPosting"
        ) {
          found = parsed;
        }
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    });

    return found;
  }

  private formatSalaryFromJsonLd(jsonLd: JobPostingLd | null): string | null {
    const value = jsonLd?.baseSalary?.value;
    if (value == null) return null;
    const currency = jsonLd?.baseSalary?.currency ?? "IRT";
    const unit = jsonLd?.baseSalary?.unitText ?? "MONTH";
    return `${value} ${currency}/${unit}`;
  }
}

interface JobPostingLd {
  "@type"?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  jobLocationType?: string;
  hiringOrganization?: {
    name?: string;
    sameAs?: string;
    logo?: string;
  };
  baseSalary?: {
    value?: number | string;
    currency?: string;
    unitText?: string;
  };
}
