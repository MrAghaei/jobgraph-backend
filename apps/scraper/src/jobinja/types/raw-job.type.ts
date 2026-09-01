/** Raw fields extracted from a Jobinja job detail page (pre-normalization). */
export interface RawJobinjaJob {
  title: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  companyLogoUrl: string | null;
  location: string | null;
  salaryRange: string | null;
  experienceLevel: string | null;
  employmentType: string | null;
  category: string | null;
  description: string | null;
  skills: string[];
  /** ISO date from JSON-LD when available, e.g. "2026-07-24". */
  datePosted: string | null;
  /** Relative Persian label from listing context, e.g. "(امروز)". */
  relativePostedLabel: string | null;
  /** TELECOMMUTE / etc. from JSON-LD when present. */
  jobLocationType: string | null;
  sourceUrl: string;
}
