export type NormalizedWorkType = "REMOTE" | "HYBRID" | "ONSITE";

export type NormalizedJobStatus = "ACTIVE" | "EXPIRED";

export type JobSource = "jobinja" | "jobvision" | "quera";

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
  city: string | null;
  salaryRange: string | null;
  experienceLevel: string | null;
  workType: NormalizedWorkType | null;
  category: string | null;
  source: JobSource;
  sourceUrl: string;
  postedAt: string;
  datePosted: string;
  status: NormalizedJobStatus;
  tags: string[];
}
