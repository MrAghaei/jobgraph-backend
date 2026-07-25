import { ScraperMapper } from "./scraper.mapper";
import { RawJobinjaJob } from "../types/raw-job.type";

describe("ScraperMapper", () => {
  const baseRaw: RawJobinjaJob = {
    title: "استخدام برنامه‌نویس ارشد PHP",
    companyName: "  Acme Co  ",
    companyWebsite: "https://acme.example",
    companyLogoUrl: "https://cdn.example/logo.png",
    location: "تهران، تهران",
    salaryRange: "توافقی",
    experienceLevel: "سه تا شش سال",
    employmentType: "تمام وقت",
    category: "وب، برنامه‌نویسی و نرم‌افزار",
    description: "توضیحات شغل با حضور در شرکت",
    skills: ["PHP", "php", "MySQL", "  "],
    datePosted: "2026-07-24",
    relativePostedLabel: null,
    jobLocationType: null,
    sourceUrl:
      "https://jobinja.ir/companies/acme/jobs/abc/title?_ref=16&_t=xyz",
  };

  it("normalizes title, company, tags, dates, and sourceUrl", () => {
    const normalized = ScraperMapper.toNormalizedJob(baseRaw);

    expect(normalized.title).toBe("برنامه‌نویس ارشد PHP");
    expect(normalized.normalizedTitle).toBe("برنامه‌نویس ارشد php");
    expect(normalized.company.name).toBe("Acme Co");
    expect(normalized.datePosted).toBe("2026-07-24");
    expect(normalized.postedAt).toBe("2026-07-24T00:00:00.000Z");
    expect(normalized.source).toBe("jobinja");
    expect(normalized.sourceUrl).toBe(
      "https://jobinja.ir/companies/acme/jobs/abc/title",
    );
    expect(normalized.tags).toEqual(["PHP", "MySQL"]);
    expect(normalized.workType).toBe("ONSITE");
    expect(normalized.status).toBe("ACTIVE");
  });

  it("maps TELECOMMUTE to REMOTE", () => {
    const normalized = ScraperMapper.toNormalizedJob({
      ...baseRaw,
      description: "توضیحات شغل",
      jobLocationType: "TELECOMMUTE",
    });

    expect(normalized.workType).toBe("REMOTE");
  });
});
