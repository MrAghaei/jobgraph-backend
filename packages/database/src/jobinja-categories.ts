/**
 * Extensible Jobinja category registry.
 * Shared by scraper (crawl targets) and core-api (filter metadata).
 */
export interface JobinjaCategoryConfig {
  /** Stable machine key used in queues / logs / Job.category. */
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
  data: {
    key: "data",
    label: "داده و هوش مصنوعی",
    url: "https://jobinja.ir/jobs/category/data-ai-jobs/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D8%AF%D8%A7%D8%AF%D9%87-%D9%88-%D9%87%D9%88%D8%B4-%D9%85%D8%B5%D9%86%D9%88%D8%B9%DB%8C",
  },
  devops: {
    key: "devops",
    label: "دواپس، شبکه و امنیت",
    url: "https://jobinja.ir/jobs/category/it-devops-network-jobs/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D8%AF%D9%88%D8%A7%D9%BE%D8%B3-%D8%B4%D8%A8%DA%A9%D9%87-%D8%A7%D9%85%D9%86%DB%8C%D8%AA",
  },
  product: {
    key: "product",
    label: "محصول و مدیریت پروژه",
    url: "https://jobinja.ir/jobs/category/product-project-jobs/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D9%85%D8%AD%D8%B5%D9%88%D9%84-%D9%88-%D9%85%D8%AF%DB%8C%D8%B1%DB%8C%D8%AA-%D9%BE%D8%B1%D9%88%DA%98%D9%87",
  },
  design: {
    key: "design",
    label: "طراحی محصول و UX",
    url: "https://jobinja.ir/jobs/category/ui-ux-design-jobs/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D8%B7%D8%B1%D8%A7%D8%AD%DB%8C-%D9%88-%D8%AA%D8%AC%D8%B1%D8%A8%D9%87-%DA%A9%D8%A7%D8%B1%D8%A8%D8%B1%DB%8C",
  },
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

function foldCategoryLabel(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200c\u200d\u200e\u200f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Values stored on `Job.category` that should match a filter key. */
export function categoryFilterValues(key: string): string[] {
  const category = JOBINJA_CATEGORIES[key as JobinjaCategoryKey];
  if (!category) return [key];
  return [category.key, category.label];
}

/** Map a Jobinja Persian label (or key) onto the stable machine key. */
export function resolveJobinjaCategoryKey(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed in JOBINJA_CATEGORIES) return trimmed;
  const folded = foldCategoryLabel(trimmed);
  for (const category of Object.values(JOBINJA_CATEGORIES)) {
    if (foldCategoryLabel(category.label) === folded) return category.key;
    if (folded.includes(foldCategoryLabel(category.label))) return category.key;
  }
  if (folded.includes("برنامه") || folded.includes("نرم افزار") || folded.includes("نرم‌افزار")) {
    return "programming";
  }
  return null;
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
