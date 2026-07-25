export const SCRAPER_QUEUE = "scraper-queue";

export const SCRAPER_JOB_NAME = "scrape-category";

/** Max 1 job processed per 2 seconds to reduce IP ban risk. */
export const SCRAPER_RATE_LIMITER = {
  max: 1,
  duration: 2000,
} as const;

export const SCRAPER_DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
