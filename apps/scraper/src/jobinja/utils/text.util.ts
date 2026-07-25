const ARABIC_YEH = /\u064A/g; // ي
const ARABIC_KAF = /\u0643/g; // ك
const PERSIAN_YEH = "\u06CC"; // ی
const PERSIAN_KEH = "\u06A9"; // ک

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Collapse whitespace and trim. */
export function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Convert Persian/Arabic digits to ASCII. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);
    const arabicIndex = ARABIC_DIGITS.indexOf(digit);
    return arabicIndex >= 0 ? String(arabicIndex) : digit;
  });
}

/**
 * Normalize a job title for deduplication (`Job.normalizedTitle`).
 * Lowercases, unifies Arabic/Persian letters, strips common Jobinja prefixes.
 */
export function normalizeTitle(title: string): string {
  let value = title.normalize("NFKC");
  value = value.replace(/^استخدام\s+/u, "");
  value = value
    .replace(ARABIC_YEH, PERSIAN_YEH)
    .replace(ARABIC_KAF, PERSIAN_KEH);
  value = value.toLocaleLowerCase("fa");
  value = value.replace(/\s+/g, " ").trim();
  return value;
}

/** Strip tracking query params from a Jobinja URL. */
export function canonicalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}
