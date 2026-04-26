import { Injectable } from "@nestjs/common";
import { SearchPipelineStatus } from "@prisma/client";
import { createHash } from "crypto";
import Redis from "ioredis";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";
import { PrismaService } from "../../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import type { SearchRequestDto } from "./dto/search-request.dto";

type NormalizedInput = {
  keyword: string;
  area: string;
  platform: string;
  intent: string;
  country?: string;
};

@Injectable()
export class SearchService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly cfg: SearchPipelineConfigService,
  ) {
    this.redis = new Redis(this.cfg.redisUrl, { maxRetriesPerRequest: 2 });
  }

  normalizeInput(input: SearchRequestDto): NormalizedInput {
    const platformSynonyms: Record<string, string> = {
      gmb: "google.com",
      google: "google.com",
      instagram: "instagram.com",
      facebook: "facebook.com",
      linkedin: "linkedin.com",
      any: "any",
    };

    const areaSynonyms: Record<string, string> = {
      nyc: "new york",
      "new york city": "new york",
      la: "los angeles",
      sf: "san francisco",
    };

    const normalizedPlatform = platformSynonyms[input.platform.trim().toLowerCase()] ?? input.platform.trim().toLowerCase();
    const normalizedArea = areaSynonyms[input.area.trim().toLowerCase()] ?? input.area.trim().toLowerCase();

    return {
      keyword: input.keyword.trim().toLowerCase(),
      area: normalizedArea,
      platform: normalizedPlatform,
      intent: input.intent?.trim().toLowerCase() ?? "",
      country: input.country?.trim().toLowerCase(),
    };
  }

  generateHash(input: NormalizedInput): string {
    return createHash("sha256")
      .update(`${input.keyword}|${input.area}|${input.platform}|${input.intent}`)
      .digest("hex");
  }

  expandQuery(input: NormalizedInput): string[] {
    const base = `${input.keyword} ${input.area}`.trim();
    const queries = [
      base,
      `${input.keyword} ${input.intent}`.trim(),
      `${input.keyword} ${input.area} ${input.intent}`.trim(),
      `${input.keyword} near ${input.area}`.trim(),
      `${input.keyword} in ${input.area}`.trim(),
    ];
    const uniq = Array.from(new Set(queries.filter(Boolean)));
    return uniq.slice(0, 2);
  }

  private mapReady(search: {
    hash: string;
    results: Array<{
      title: string;
      link: string;
      snippet: string;
      domain: { domain: string; business: { id: string; name: string; confidenceScore: number; contacts: Array<{ type: string; value: string }>; socialProfiles: Array<{ platform: string; url: string }> } | null };
    }>;
  }) {
    const data = search.results.map((r) => ({
      businessId: r.domain.business?.id ?? null,
      businessName: r.domain.business?.name ?? r.title,
      domain: r.domain.domain,
      link: r.link,
      snippet: r.snippet,
      contacts: r.domain.business?.contacts ?? [],
      socialProfiles: r.domain.business?.socialProfiles ?? [],
      score: r.domain.business?.confidenceScore ?? 0,
    }));
    const avgScore =
      data.length === 0 ? 0 : Math.round(data.reduce((acc, item) => acc + item.score, 0) / data.length);
    return {
      hash: search.hash,
      status: "ready" as const,
      data,
      meta: { score: avgScore, totalResults: data.length },
    };
  }

  async getByHash(hash: string) {
    const redisKey = `search:${hash}`;
    const cached = await this.redis.get(redisKey);
    if (cached) {
      return JSON.parse(cached) as {
        status: "ready" | "processing";
        data: unknown[];
        meta: { score: number; totalResults: number };
      };
    }

    const row = await this.prisma.search.findUnique({
      where: { hash },
      include: {
        results: {
          orderBy: { position: "asc" },
          include: {
            domain: {
              include: {
                business: {
                  include: { contacts: true, socialProfiles: true },
                },
              },
            },
          },
        },
      },
    });

    if (!row || row.status !== SearchPipelineStatus.READY) {
      return { status: "processing" as const, data: [], meta: { score: 0, totalResults: 0 } };
    }

    const ready = this.mapReady(row);
    await this.redis.set(
      redisKey,
      JSON.stringify(ready),
      "EX",
      this.cfg.searchCacheTtlDays * 24 * 60 * 60,
    );
    return ready;
  }

  async search(input: SearchRequestDto) {
    const normalized = this.normalizeInput(input);
    const hash = this.generateHash(normalized);
    const redisKey = `search:${hash}`;

    const redisHit = await this.redis.get(redisKey);
    if (redisHit) {
      return JSON.parse(redisHit);
    }

    const existing = await this.prisma.search.findUnique({
      where: { hash },
      select: { id: true, lastFetchedAt: true, status: true },
    });
    const staleAfterMs = this.cfg.searchCacheTtlDays * 24 * 60 * 60 * 1000;
    const dbFresh =
      existing?.lastFetchedAt &&
      Date.now() - existing.lastFetchedAt.getTime() < staleAfterMs &&
      existing.status === SearchPipelineStatus.READY;

    if (dbFresh) {
      return this.getByHash(hash);
    }

    const search = await this.prisma.search.upsert({
      where: { hash },
      create: {
        hash,
        keyword: normalized.keyword,
        area: normalized.area,
        country: normalized.country,
        platform: normalized.platform,
        intent: normalized.intent || null,
        status: SearchPipelineStatus.PROCESSING,
      },
      update: {
        status: SearchPipelineStatus.PROCESSING,
        error: null,
      },
      select: { id: true },
    });

    const candidates = this.expandQuery(normalized);
    await this.queueService.enqueueSearch({
      searchId: search.id,
      hash,
      query: candidates[0],
      platform: normalized.platform,
      area: normalized.area,
      keyword: normalized.keyword,
    });

    return { hash, status: "processing" as const, data: [], meta: { score: 0, totalResults: 0 } };
  }
}
