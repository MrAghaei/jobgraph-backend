import { JobinjaCategoryKey } from "../../jobinja/config/jobinja-categories";

export const SCRAPER_PLATFORMS = ["jobinja"] as const;

export type ScraperPlatform = (typeof SCRAPER_PLATFORMS)[number];

export interface ScraperJobPayload {
  platform: ScraperPlatform;
  categoryKey: JobinjaCategoryKey;
  maxPages: number;
}

export type JobinjaScrapeJobPayload = ScraperJobPayload & {
  platform: "jobinja";
};
