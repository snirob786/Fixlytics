import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SearchPipelineConfigService {
  constructor(private readonly config: ConfigService) {}

  get googleApiKey(): string {
    return this.config.getOrThrow<string>("GOOGLE_API_KEY");
  }

  get googleCseId(): string {
    return this.config.getOrThrow<string>("GOOGLE_CSE_ID");
  }

  get redisUrl(): string {
    return this.config.getOrThrow<string>("REDIS_URL");
  }

  get searchCacheTtlDays(): number {
    return this.config.get<number>("SEARCH_CACHE_TTL_DAYS", 7);
  }

  get searchDailyLimit(): number {
    return this.config.get<number>("SEARCH_DAILY_LIMIT", 90);
  }
}
