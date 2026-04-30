import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";

type GoogleSearchResponse = {
  items?: Array<{ title?: string; link?: string; snippet?: string }>;
};

@Injectable()
export class GoogleService {
  private readonly redis: Redis;
  private readonly logger = new Logger(GoogleService.name);
  private static readonly REQUEST_TIMEOUT_MS = 12_000;
  private static readonly ITEMS_PER_REQUEST = 10;

  constructor(private readonly cfg: SearchPipelineConfigService) {
    this.redis = new Redis(this.cfg.redisUrl, { maxRetriesPerRequest: 2 });
  }

  private dailyLimitKey(now = new Date()): string {
    return `google:daily:${now.toISOString().slice(0, 10)}`;
  }

  private dailyMetricKey(metric: "items_requested" | "items_returned", now = new Date()): string {
    return `google:${metric}:daily:${now.toISOString().slice(0, 10)}`;
  }

  private async incrementDailyMetric(
    metric: "items_requested" | "items_returned",
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    try {
      const key = this.dailyMetricKey(metric);
      const count = await this.redis.incrby(key, amount);
      if (count === amount) {
        await this.redis.expire(key, 172800);
      }
    } catch (error) {
      this.logger.warn(
        `google_metric_failed metric=${metric} amount=${amount} error=${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  private async assertDailyLimit(): Promise<void> {
    try {
      const key = this.dailyLimitKey();
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 172800);
      }
      if (count > this.cfg.searchDailyLimit) {
        throw new HttpException("Google daily limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn(
        `google_daily_limit_check_failed error=${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  private buildQuery(query: string, platform?: string, area?: string): string {
    const parts = [query.trim()];
    if (platform && platform !== "any") {
      parts.push(`site:${platform}`);
    }
    if (area) {
      parts.push(area.trim());
    }
    return parts.join(" ");
  }

  async search(query: string, opts?: { platform?: string; area?: string }): Promise<GoogleSearchResponse> {
    await this.assertDailyLimit();
    await this.incrementDailyMetric("items_requested", GoogleService.ITEMS_PER_REQUEST);
    const q = this.buildQuery(query, opts?.platform, opts?.area);
    const base = "https://www.googleapis.com/customsearch/v1";
    const params = new URLSearchParams({
      key: this.cfg.googleApiKey,
      cx: this.cfg.googleCseId,
      q,
      num: String(GoogleService.ITEMS_PER_REQUEST),
    });
    const url = `${base}?${params.toString()}`;
    this.logger.log(`google_request_started q="${q}" num=${GoogleService.ITEMS_PER_REQUEST}`);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GoogleService.REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, { signal: controller.signal });
      } catch (error) {
        this.logger.warn(
          `google_request_attempt_failed attempt=${attempt + 1} error=${error instanceof Error ? error.message : "unknown"}`,
        );
        if (attempt >= 2) {
          const message =
            error instanceof Error && error.name === "AbortError"
              ? "Google search request timed out"
              : "Google search request failed";
          throw new HttpException(message, HttpStatus.BAD_GATEWAY);
        }
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      } finally {
        clearTimeout(timeout);
      }
      if (res.ok) {
        const payload = (await res.json()) as GoogleSearchResponse;
        await this.incrementDailyMetric("items_returned", payload.items?.length ?? 0);
        this.logger.log(
          `google_request_succeeded attempt=${attempt + 1} returnedItems=${payload.items?.length ?? 0}`,
        );
        return payload;
      }
      this.logger.warn(`google_request_http_error attempt=${attempt + 1} status=${res.status}`);
      if (attempt >= 2) {
        const body = await res.text();
        throw new HttpException(
          `Google search failed (${res.status}): ${body.slice(0, 250)}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
    throw new HttpException("Google search failed", HttpStatus.BAD_GATEWAY);
  }
}
