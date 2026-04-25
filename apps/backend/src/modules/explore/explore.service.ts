import { Injectable, Logger } from "@nestjs/common";
import { Prisma, SearchSource } from "@prisma/client";
import { randomUUID } from "crypto";

import { UNDERPERFORMING_SCORE_THRESHOLD } from "../../common/constants/scoring";
import { PrismaService } from "../../prisma/prisma.service";
import type { ExploreSaveDto } from "./dto/explore-save.dto";
import type { ExploreSearchDto } from "./dto/explore-search.dto";

export const EXPLORE_DEFAULT_THRESHOLD = UNDERPERFORMING_SCORE_THRESHOLD;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ExploreSearchResultItem = {
  id: string;
  title: string;
  url: string;
  platform: string;
  tags: string[];
  scores: { seo: number; performance: number; design: number };
  avgScore: number;
};

export type ExploreSearchResponse = {
  queryMeta: {
    keyword: string;
    platform: SearchSource;
    area: string;
    tags: string[];
  };
  thresholdDefault: number;
  items: ExploreSearchResultItem[];
};

export type ExploreSaveResponse = {
  searchId: string;
  savedCount: number;
};

export type ExploreConfigResponse = {
  platforms: SearchSource[];
  maxLimit: number;
  defaultThreshold: number;
};

@Injectable()
export class ExploreService {
  private readonly logger = new Logger(ExploreService.name);

  constructor(private readonly prisma: PrismaService) {}

  getConfig(): ExploreConfigResponse {
    return {
      platforms: [SearchSource.GOOGLE, SearchSource.MAPS, SearchSource.DIRECTORY],
      maxLimit: MAX_LIMIT,
      defaultThreshold: EXPLORE_DEFAULT_THRESHOLD,
    };
  }

  /**
   * Ephemeral search workspace: deterministic fixture-style results until outbound scraping is wired.
   * No database writes.
   */
  search(_userId: string, dto: ExploreSearchDto): ExploreSearchResponse {
    const limit = Math.min(MAX_LIMIT, Math.max(1, dto.limit ?? DEFAULT_LIMIT));
    const queryMeta = {
      keyword: dto.keyword.trim(),
      platform: dto.platform,
      area: dto.area.trim(),
      tags: [...dto.tags],
    };

    if (dto.tags.length) {
      this.logger.debug(`Explore search with ${dto.tags.length} tag(s) (stub scoring may vary by tag hash)`);
    }

    const items: ExploreSearchResultItem[] = Array.from({ length: limit }, (_, i) => {
      const id = randomUUID();
      const tagSalt = dto.tags.reduce((a, t) => a + t.length, 0);
      const base = 45 + ((dto.keyword.length + dto.area.length + tagSalt + i * 7) % 46);
      const seo = Math.min(100, base + (i % 5));
      const performance = Math.min(100, base + ((i + 1) % 6));
      const design = Math.min(100, base + ((i + 2) % 4));
      const avgRaw = (seo + performance + design) / 3;
      const avgScore = Math.round(avgRaw * 10) / 10;
      const slug = dto.keyword.replace(/\s+/g, "-").toLowerCase();
      const itemTags = [...dto.tags];
      if (itemTags.length === 0) {
        itemTags.push("discovery");
      }
      return {
        id,
        title: `${dto.keyword} — ${dto.area} (#${i + 1})`,
        url: `https://example.com/${slug}/hit-${i + 1}`,
        platform: dto.platform,
        tags: itemTags,
        scores: { seo, performance, design },
        avgScore,
      };
    });

    return {
      queryMeta,
      thresholdDefault: EXPLORE_DEFAULT_THRESHOLD,
      items,
    };
  }

  /**
   * Persists a new SavedSearch (Prisma uses `location` for area) and selected leads with Analysis rows.
   */
  async save(userId: string, dto: ExploreSaveDto): Promise<ExploreSaveResponse> {
    const threshold = UNDERPERFORMING_SCORE_THRESHOLD;
    const { keyword, platform, area, tags } = dto.queryMeta;

    const saved = await this.prisma.$transaction(async (tx) => {
      const search = await tx.savedSearch.create({
        data: {
          userId,
          keyword: keyword.trim(),
          location: area.trim(),
          source: platform,
        },
      });

      let count = 0;
      for (const item of dto.selectedItems) {
        const lead = await tx.lead.upsert({
          where: {
            searchId_url: { searchId: search.id, url: item.url },
          },
          create: {
            searchId: search.id,
            userId,
            url: item.url,
            title: item.title.trim(),
          },
          update: { title: item.title.trim() },
        });

        const categoryScores = {
          seo: item.scores.seo,
          performance: item.scores.performance,
          design: item.scores.design,
        };
        const avgScore =
          (categoryScores.seo + categoryScores.performance + categoryScores.design) / 3;
        const isUnderperforming = avgScore < threshold;

        const scrapedPayload: Record<string, unknown> = {
          source: "explore-save",
          exploreItemId: item.id,
          title: item.title,
          url: item.url,
          tags,
          clientAvgScore: item.avgScore,
        };

        await tx.analysis.upsert({
          where: { leadId: lead.id },
          create: {
            leadId: lead.id,
            userId,
            scrapedPayload: scrapedPayload as Prisma.InputJsonValue,
            rawMetrics: {} as Prisma.InputJsonValue,
            categoryScores: categoryScores as Prisma.InputJsonValue,
            checks: {} as Prisma.InputJsonValue,
            avgScore,
            isUnderperforming,
          },
          update: {
            scrapedPayload: scrapedPayload as Prisma.InputJsonValue,
            rawMetrics: {} as Prisma.InputJsonValue,
            categoryScores: categoryScores as Prisma.InputJsonValue,
            checks: {} as Prisma.InputJsonValue,
            avgScore,
            isUnderperforming,
          },
        });
        count += 1;
      }

      return { searchId: search.id, savedCount: count };
    });

    return saved;
  }
}
