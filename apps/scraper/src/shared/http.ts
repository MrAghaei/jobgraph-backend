import axios, { AxiosInstance } from "axios";
import { ScraperHttpError } from "../jobinja/errors/scraper-http.error";

export function createScraperHttp(): AxiosInstance {
  return axios.create({
    timeout: 30_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
      Accept: "text/html,application/json,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    validateStatus: () => true,
  });
}

async function assertOk(
  status: number,
  url: string,
): Promise<void> {
  if (status === 429 || status === 403) {
    throw new ScraperHttpError(status, url);
  }
  if (status >= 400) {
    throw new ScraperHttpError(status, url);
  }
}

export async function fetchOk(
  http: AxiosInstance,
  url: string,
): Promise<{ data: unknown; contentType: string; status: number }> {
  const response = await http.get(url);
  await assertOk(response.status, url);
  const contentType = String(response.headers["content-type"] ?? "");
  return { data: response.data, contentType, status: response.status };
}

export async function fetchOkPost(
  http: AxiosInstance,
  url: string,
  body: unknown,
): Promise<{ data: unknown; contentType: string; status: number }> {
  const response = await http.post(url, body, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
  await assertOk(response.status, url);
  const contentType = String(response.headers["content-type"] ?? "");
  return { data: response.data, contentType, status: response.status };
}

export function mapWorkType(value: string | null | undefined) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (
    v.includes("remote") ||
    value.includes("دورکار") ||
    value.includes("ریموت")
  ) {
    return "REMOTE" as const;
  }
  if (v.includes("hybrid") || value.includes("هیبرید")) {
    return "HYBRID" as const;
  }
  if (
    v.includes("onsite") ||
    value.includes("حضوری") ||
    value.includes("تمام وقت")
  ) {
    return "ONSITE" as const;
  }
  return null;
}

export function nowDates(): { postedAt: string; datePosted: string } {
  const now = new Date();
  return {
    postedAt: now.toISOString(),
    datePosted: now.toISOString().slice(0, 10),
  };
}
