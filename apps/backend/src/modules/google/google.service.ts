import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";

type GoogleSearchResponse = {
  items?: Array<{ title?: string; link?: string; snippet?: string }>;
};

@Injectable()
export class GoogleService {
  private readonly redis: Redis;

  constructor(private readonly cfg: SearchPipelineConfigService) {
    this.redis = new Redis(this.cfg.redisUrl, { maxRetriesPerRequest: 2 });
  }

  private dailyLimitKey(now = new Date()): string {
    return `google:daily:${now.toISOString().slice(0, 10)}`;
  }

  private async assertDailyLimit(): Promise<void> {
    const key = this.dailyLimitKey();
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 172800);
    }
    if (count > this.cfg.searchDailyLimit) {
      throw new HttpException("Google daily limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
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
    const q = this.buildQuery(query, opts?.platform, opts?.area);
    const base = "https://www.googleapis.com/customsearch/v1";
    const params = new URLSearchParams({
      key: this.cfg.googleApiKey,
      cx: this.cfg.googleCseId,
      q,
      num: "10",
    });
    const url = `${base}?${params.toString()}`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as GoogleSearchResponse;
      }
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
