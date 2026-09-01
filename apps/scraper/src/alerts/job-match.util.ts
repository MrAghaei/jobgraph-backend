import { WorkType } from "@repo/database";
import { NormalizedJob } from "../jobinja/types/normalized-job.type";

export interface SearchQuery {
  keyword?: string | null;
  category?: string | null;
  city?: string | null;
  workType?: WorkType | null;
  experience?: string | null;
}

export function jobMatchesSearch(
  job: Pick<
    NormalizedJob,
    "title" | "description" | "category" | "city" | "workType" | "experienceLevel" | "tags"
  > & { companyName?: string },
  query: SearchQuery,
): boolean {
  if (query.category && job.category !== query.category) return false;
  if (query.city && job.city !== query.city) return false;
  if (query.workType && job.workType !== query.workType) return false;
  if (query.experience && job.experienceLevel) {
    if (!job.experienceLevel.includes(query.experience)) return false;
  } else if (query.experience && !job.experienceLevel) {
    return false;
  }

  const keyword = query.keyword?.trim().toLowerCase();
  if (!keyword) return true;

  const haystack = [
    job.title,
    job.description,
    job.companyName ?? "",
    ...job.tags,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword);
}
