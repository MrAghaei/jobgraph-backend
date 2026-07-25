import { RawJobinjaJob } from "../types/raw-job.type";
import {
  NormalizedJob,
  NormalizedWorkType,
} from "../types/normalized-job.type";
import {
  canonicalizeSourceUrl,
  cleanText,
  normalizeTitle,
  toAsciiDigits,
} from "../utils/text.util";

/**
 * Pure mapper: raw Jobinja extraction → schema-aligned JSON.
 * No Nest DI / no database — safe to unit-test in isolation.
 */
export class ScraperMapper {
  static toNormalizedJob(raw: RawJobinjaJob): NormalizedJob {
    const title =
      cleanText(raw.title)?.replace(/^استخدام\s+/u, "") ?? "untitled";
    const companyName = cleanText(raw.companyName) ?? "unknown";
    const description = cleanText(raw.description) ?? "";
    const { postedAt, datePosted } = this.resolvePostedDates(raw);

    return {
      title,
      normalizedTitle: normalizeTitle(title),
      description,
      company: {
        name: companyName,
        website: cleanText(raw.companyWebsite),
        logoUrl: cleanText(raw.companyLogoUrl),
      },
      location: cleanText(raw.location),
      salaryRange: cleanText(raw.salaryRange),
      experienceLevel: cleanText(raw.experienceLevel),
      workType: this.mapWorkType(raw),
      category: cleanText(raw.category),
      source: "jobinja",
      sourceUrl: canonicalizeSourceUrl(raw.sourceUrl),
      postedAt,
      datePosted,
      status: "ACTIVE",
      tags: this.normalizeTags(raw.skills),
    };
  }

  private static resolvePostedDates(raw: RawJobinjaJob): {
    postedAt: string;
    datePosted: string;
  } {
    const isoDate = this.parseIsoDate(raw.datePosted);
    if (isoDate) {
      return {
        postedAt: isoDate.toISOString(),
        datePosted: isoDate.toISOString().slice(0, 10),
      };
    }

    const fromRelative = this.parseRelativePersianLabel(
      raw.relativePostedLabel,
    );
    if (fromRelative) {
      return {
        postedAt: fromRelative.toISOString(),
        datePosted: fromRelative.toISOString().slice(0, 10),
      };
    }

    const now = new Date();
    return {
      postedAt: now.toISOString(),
      datePosted: now.toISOString().slice(0, 10),
    };
  }

  private static parseIsoDate(value: string | null): Date | null {
    if (!value) return null;
    const normalized = toAsciiDigits(value.trim());
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    if (!match) return null;
    const date = new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * Best-effort parse of listing labels like "(امروز)" / "(۲ روز پیش)".
   */
  private static parseRelativePersianLabel(label: string | null): Date | null {
    if (!label) return null;
    const text = toAsciiDigits(label);

    if (/امروز/.test(text)) {
      return startOfUtcDay(new Date());
    }
    if (/دیروز/.test(text)) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 1);
      return startOfUtcDay(d);
    }

    const daysMatch = /(\d+)\s*روز\s*پیش/.exec(text);
    if (daysMatch) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - Number(daysMatch[1]));
      return startOfUtcDay(d);
    }

    return null;
  }

  private static mapWorkType(raw: RawJobinjaJob): NormalizedWorkType | null {
    const description = (raw.description ?? "").toLowerCase();
    const location = (raw.location ?? "").toLowerCase();
    const employment = (raw.employmentType ?? "").toLowerCase();
    const ldType = (raw.jobLocationType ?? "").toLowerCase();
    const localSignals = `${description} ${employment} ${location}`;

    // Prefer body/info-box cues — Jobinja JSON-LD often marks TELECOMMUTE incorrectly.
    if (/حضور در (محل|شرکت)|حضوری/.test(description)) {
      return "ONSITE";
    }
    if (/دورکار|دور کاری|ریموت|remote/.test(localSignals)) {
      return "REMOTE";
    }
    if (/هیبرید|ترکیبی|hybrid/.test(localSignals)) {
      return "HYBRID";
    }

    if (/telecommute|remote/.test(ldType)) {
      return "REMOTE";
    }
    if (/hybrid/.test(ldType)) {
      return "HYBRID";
    }
    if (/onsite/.test(ldType)) {
      return "ONSITE";
    }

    return null;
  }

  private static normalizeTags(skills: string[]): string[] {
    const seen = new Set<string>();
    const tags: string[] = [];

    for (const skill of skills) {
      const cleaned = cleanText(skill);
      if (!cleaned) continue;
      const key = cleaned.toLocaleLowerCase("fa");
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(cleaned);
    }

    return tags;
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
