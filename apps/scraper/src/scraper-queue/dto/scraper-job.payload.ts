export const SCRAPER_PLATFORMS = ["jobinja"] as const;

export type ScraperPlatform = (typeof SCRAPER_PLATFORMS)[number];

export interface ScraperJobPayload {
  platform: ScraperPlatform;
  categoryUrl: string;
  pagesToScrape: number;
}

export type JobinjaScrapeJobPayload = ScraperJobPayload & {
  platform: "jobinja";
};
