/**
 * Schema-aligned scrape result (no DB ids).
 * Mirrors Prisma `Job` + nested `Company` / tags for the persistence layer.
 */
export type NormalizedWorkType = "REMOTE" | "HYBRID" | "ONSITE";

export type NormalizedJobStatus = "ACTIVE" | "EXPIRED";

export interface NormalizedCompany {
  name: string;
  website: string | null;
  logoUrl: string | null;
}

export interface NormalizedJob {
  title: string;
  normalizedTitle: string;
  description: string;
  company: NormalizedCompany;
  location: string | null;
  salaryRange: string | null;
  experienceLevel: string | null;
  workType: NormalizedWorkType | null;
  category: string | null;
  source: "jobinja";
  sourceUrl: string;
  /** Full timestamp used for `Job.postedAt`. */
  postedAt: string;
  /** Calendar date `YYYY-MM-DD` used for `Job.datePosted`. */
  datePosted: string;
  status: NormalizedJobStatus;
  tags: string[];
}
