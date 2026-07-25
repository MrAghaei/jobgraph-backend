import { Injectable } from "@nestjs/common";
import { NormalizedJob } from "../jobinja/types/normalized-job.type";

/**
 * Basic keyword skills matched against job title + description.
 * Names are stored as Tag.name / used for JobTag relations.
 */
const SKILL_KEYWORDS = [
  "react",
  "nestjs",
  "typescript",
  "javascript",
  "nodejs",
  "node.js",
  "next.js",
  "nextjs",
  "vue",
  "angular",
  "python",
  "django",
  "fastapi",
  "java",
  "spring",
  "go",
  "golang",
  "rust",
  "php",
  "laravel",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "graphql",
  "prisma",
  "tailwind",
] as const;

/** Canonical tag name for multi-alias keywords. */
const SKILL_CANONICAL: Record<string, string> = {
  "node.js": "Node.js",
  nodejs: "Node.js",
  "next.js": "Next.js",
  nextjs: "Next.js",
  nestjs: "NestJS",
  react: "React",
  typescript: "TypeScript",
  javascript: "JavaScript",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  golang: "Go",
  go: "Go",
};

@Injectable()
export class SkillExtractionService {
  /**
   * Scan title + description for known skill keywords.
   * Returns canonical tag names ready for the JobTag relation.
   */
  extractFromJob(job: Pick<NormalizedJob, "title" | "description">): string[] {
    const haystack = `${job.title}\n${job.description}`.toLowerCase();
    const matched = new Set<string>();

    for (const keyword of SKILL_KEYWORDS) {
      if (!this.containsKeyword(haystack, keyword)) continue;
      matched.add(SKILL_CANONICAL[keyword] ?? this.toDisplayName(keyword));
    }

    return [...matched];
  }

  private containsKeyword(haystack: string, keyword: string): boolean {
    // Word-boundary-ish match so "go" does not hit inside "google".
    const escaped = keyword.replace(/\./g, "\\.");
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`,
      "i",
    );
    return pattern.test(haystack);
  }

  private toDisplayName(keyword: string): string {
    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }
}
