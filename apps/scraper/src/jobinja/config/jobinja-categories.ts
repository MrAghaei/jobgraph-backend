/**
 * Re-export shared Jobinja category registry from @repo/database.
 * Prefer importing from `@repo/database` in new code.
 */
export {
  JOBINJA_CATEGORIES,
  buildCategoryPageUrl,
  getJobinjaCategory,
  listJobinjaCategories,
  type JobinjaCategoryConfig,
  type JobinjaCategoryKey,
} from "@repo/database";
