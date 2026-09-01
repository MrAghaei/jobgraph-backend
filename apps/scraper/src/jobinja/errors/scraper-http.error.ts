/**
 * Thrown on HTTP failures that BullMQ should treat as retryable
 * (rate-limit / ban responses).
 */
export class ScraperHttpError extends Error {
  readonly statusCode: number;
  readonly url: string;
  readonly retryable: boolean;

  constructor(statusCode: number, url: string, message?: string) {
    const retryable = statusCode === 429 || statusCode === 403;
    super(
      message ??
        `Jobinja request failed with HTTP ${statusCode} for ${url}` +
          (retryable ? " (retryable)" : ""),
    );
    this.name = "ScraperHttpError";
    this.statusCode = statusCode;
    this.url = url;
    this.retryable = retryable;
  }
}
