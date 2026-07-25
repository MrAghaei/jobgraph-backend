/**
 * Extensible Jobinja category registry.
 * Add a new entry here to scrape another category — no service changes needed.
 */
export interface JobinjaCategoryConfig {
  /** Stable machine key used in queues / logs. */
  key: string;
  /** Human-readable Persian label. */
  label: string;
  /** Canonical category listing URL (page 1). */
  url: string;
}

export const JOBINJA_CATEGORIES = {
  programming: {
    key: "programming",
    label: "وب، برنامه‌نویسی و نرم‌افزار",
    url: "https://jobinja.ir/jobs/category/it-software-web-development-jobs/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D9%88%D8%A8-%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D9%87-%D9%86%D9%88%DB%8C%D8%B3-%D9%86%D8%B1%D9%85-%D8%A7%D9%81%D8%B2%D8%A7%D8%B1",
  },
  // marketing: { key: "marketing", label: "...", url: "..." },
  // sales: { key: "sales", label: "...", url: "..." },
} as const satisfies Record<string, JobinjaCategoryConfig>;

export type JobinjaCategoryKey = keyof typeof JOBINJA_CATEGORIES;

export function getJobinjaCategory(
  key: JobinjaCategoryKey | (string & {}),
): JobinjaCategoryConfig {
  const category = JOBINJA_CATEGORIES[key as JobinjaCategoryKey];
  if (!category) {
    throw new Error(
      `Unknown Jobinja category "${key}". Known: ${Object.keys(JOBINJA_CATEGORIES).join(", ")}`,
    );
  }
  return category;
}

export function listJobinjaCategories(): JobinjaCategoryConfig[] {
  return Object.values(JOBINJA_CATEGORIES);
}

/** Append or update the `page` query param on a category listing URL. */
export function buildCategoryPageUrl(
  categoryUrl: string,
  page: number,
): string {
  const url = new URL(categoryUrl);
  if (page <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", String(page));
  }
  return url.toString();
}
