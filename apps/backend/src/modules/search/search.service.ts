import { Injectable, Logger } from "@nestjs/common";
import { SearchPipelineStatus } from "@prisma/client";
import { createHash } from "crypto";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainService } from "../domain/domain.service";
import { GoogleService } from "../google/google.service";
import { ParserService } from "../parser/parser.service";
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
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: SearchPipelineConfigService,
    private readonly google: GoogleService,
    private readonly parser: ParserService,
    private readonly domainService: DomainService,
  ) {}

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

    if (!row) {
      return { status: "processing" as const, data: [], meta: { score: 0, totalResults: 0 } };
    }

    if (row.status === SearchPipelineStatus.FAILED) {
      return {
        status: "failed" as const,
        data: [],
        meta: { score: 0, totalResults: 0 },
        error: row.error ?? "Search processing failed",
      };
    }

    if (row.status !== SearchPipelineStatus.READY) {
      return { status: "processing" as const, data: [], meta: { score: 0, totalResults: 0 } };
    }

    return this.mapReady(row);
  }

  async search(input: SearchRequestDto) {
    const normalized = this.normalizeInput(input);
    const hash = this.generateHash(normalized);
    this.logger.log(`search_start hash=${hash} keyword="${normalized.keyword}" area="${normalized.area}" platform="${normalized.platform}"`);

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
      this.logger.log(`search_cache_hit hash=${hash} source=db`);
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

    const [query] = this.expandQuery(normalized);
    this.logger.log(`search_google_request hash=${hash} query="${query}"`);

    try {
      const response = await this.google.search(query, {
        platform: normalized.platform,
        area: normalized.area,
      });
      const parsed = this.parser.parseGoogle(response.items ?? []);
      this.logger.log(`search_google_response hash=${hash} rawItems=${response.items?.length ?? 0} parsedItems=${parsed.length}`);

      await this.prisma.searchResult.deleteMany({ where: { searchId: search.id } });
      for (const item of parsed) {
        const domain = await this.domainService.upsertDomain(item.domain, item.rootDomain);
        await this.prisma.searchResult.create({
          data: {
            searchId: search.id,
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            position: item.position,
            domainId: domain.id,
          },
        });
      }

      await this.prisma.search.update({
        where: { id: search.id },
        data: {
          status: SearchPipelineStatus.READY,
          error: null,
          lastFetchedAt: new Date(),
        },
      });

      this.logger.log(`search_ready hash=${hash} persistedItems=${parsed.length}`);
      return this.getByHash(hash);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 500) : "search processing failed";
      await this.prisma.search.update({
        where: { id: search.id },
        data: {
          status: SearchPipelineStatus.FAILED,
          error: message,
        },
      });
      this.logger.error(`search_failed hash=${hash} error=${message}`);
      return { hash, status: "failed" as const, data: [], meta: { score: 0, totalResults: 0 }, error: message };
    }
  }
}
