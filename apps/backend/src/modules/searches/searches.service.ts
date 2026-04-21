import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, type SavedSearch } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PipelineJobsService } from "../jobs/pipeline-jobs.service";
import { CreateSearchDto } from "./dto/create-search.dto";
import { ListSearchesQuery, MAX_SEARCH_LIST_PAGE_SIZE } from "./dto/list-searches.query";
import { UpdateSearchDto } from "./dto/update-search.dto";

const UNDERPERFORMING_AVG_THRESHOLD = 58;

function avgCategoryScore(categoryScores: unknown): number | null {
  if (!categoryScores || typeof categoryScores !== "object") return null;
  const o = categoryScores as Record<string, unknown>;
  const seo = Number(o.seo);
  const performance = Number(o.performance);
  const design = Number(o.design);
  if (![seo, performance, design].every((n) => Number.isFinite(n))) return null;
  return (seo + performance + design) / 3;
}

@Injectable()
export class SearchesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly pipelineJobs?: PipelineJobsService,
  ) {}

  normalizeListQuery(query: ListSearchesQuery): {
    page: number;
    pageSize: number;
    recent: boolean;
    underperformingOnly: boolean;
  } {
    const recent = !!query.recent;
    const underperformingOnly = !!query.underperformingOnly;
    const page = Math.max(1, query.page ?? 1);
    const defaultPageSize = recent ? 5 : 20;
    const raw = query.pageSize ?? defaultPageSize;
    const pageSize = Math.min(MAX_SEARCH_LIST_PAGE_SIZE, Math.max(1, raw));
    return { page, pageSize, recent, underperformingOnly };
  }

  async create(userId: string, dto: CreateSearchDto): Promise<SavedSearch> {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        keyword: dto.keyword.trim(),
        location: dto.location.trim(),
        source: dto.source,
      },
    });
  }

  async list(userId: string, query: ListSearchesQuery) {
    const { page, pageSize } = this.normalizeListQuery(query);
    const where: Prisma.SavedSearchWhereInput = { userId };
    const [items, total] = await Promise.all([
      this.prisma.savedSearch.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { leads: true } },
        },
      }),
      this.prisma.savedSearch.count({ where }),
    ]);
    return {
      items: items.map((s) => ({
        id: s.id,
        keyword: s.keyword,
        location: s.location,
        source: s.source,
        cursorPage: s.cursorPage,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        leadCount: s._count.leads,
      })),
      page,
      pageSize,
      total,
    };
  }

  async getOwnedOrThrow(userId: string, id: string): Promise<SavedSearch> {
    const search = await this.prisma.savedSearch.findFirst({
      where: { id, userId },
    });
    if (!search) {
      throw new NotFoundException("Search not found");
    }
    return search;
  }

  async getDetail(userId: string, id: string) {
    const search = await this.prisma.savedSearch.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { leads: true, caches: true } },
      },
    });
    if (!search) {
      throw new NotFoundException("Search not found");
    }
    return {
      id: search.id,
      keyword: search.keyword,
      location: search.location,
      source: search.source,
      cursorPage: search.cursorPage,
      createdAt: search.createdAt.toISOString(),
      updatedAt: search.updatedAt.toISOString(),
      leadCount: search._count.leads,
      cachedPages: search._count.caches,
    };
  }

  async update(userId: string, id: string, dto: UpdateSearchDto): Promise<SavedSearch> {
    await this.getOwnedOrThrow(userId, id);
    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(dto.keyword !== undefined ? { keyword: dto.keyword.trim() } : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
  }

  async enqueueRun(userId: string, id: string, resume: boolean): Promise<{ ok: true }> {
    await this.getOwnedOrThrow(userId, id);
    if (!this.pipelineJobs) {
      throw new ServiceUnavailableException(
        "Job queue is disabled (set USE_JOB_QUEUE=true and REDIS_URL, then restart). Saved searches are still stored in the database.",
      );
    }
    await this.pipelineJobs.enqueueScrapeSearch(userId, id, resume);
    return { ok: true as const };
  }

  async listLeads(userId: string, searchId: string, query: ListSearchesQuery) {
    await this.getOwnedOrThrow(userId, searchId);
    const { page, pageSize, underperformingOnly } = this.normalizeListQuery(query);
    const skip = (page - 1) * pageSize;
    const threshold = UNDERPERFORMING_AVG_THRESHOLD;

    if (underperformingOnly) {
      const countRows = await this.prisma.$queryRaw<Array<{ c: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "Lead" l
          INNER JOIN "Analysis" a ON a."lead_id" = l."id"
          WHERE l."search_id" = ${searchId}
            AND l."user_id" = ${userId}
            AND (
              (COALESCE((a."category_scores"->>'seo')::double precision, 0) +
               COALESCE((a."category_scores"->>'performance')::double precision, 0) +
               COALESCE((a."category_scores"->>'design')::double precision, 0)) / 3.0 < ${threshold}
            )
        `,
      );
      const total = Number(countRows[0]?.c ?? 0);

      const idRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT l."id"
          FROM "Lead" l
          INNER JOIN "Analysis" a ON a."lead_id" = l."id"
          WHERE l."search_id" = ${searchId}
            AND l."user_id" = ${userId}
            AND (
              (COALESCE((a."category_scores"->>'seo')::double precision, 0) +
               COALESCE((a."category_scores"->>'performance')::double precision, 0) +
               COALESCE((a."category_scores"->>'design')::double precision, 0)) / 3.0 < ${threshold}
            )
          ORDER BY l."created_at" DESC
          LIMIT ${pageSize} OFFSET ${skip}
        `,
      );
      const ids = idRows.map((r) => r.id);
      if (ids.length === 0) {
        return { items: [], page, pageSize, total };
      }
      const leads = await this.prisma.lead.findMany({
        where: { id: { in: ids }, userId, searchId },
        include: {
          analysis: { select: { id: true, createdAt: true, categoryScores: true } },
        },
      });
      const order = new Map(ids.map((id, i) => [id, i] as const));
      leads.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      return {
        items: leads.map((l) => {
          const avg = avgCategoryScore(l.analysis?.categoryScores);
          return {
            id: l.id,
            url: l.url,
            title: l.title,
            createdAt: l.createdAt.toISOString(),
            analysisId: l.analysis?.id ?? null,
            analyzedAt: l.analysis?.createdAt.toISOString() ?? null,
            avgScore: avg,
            underperforming: true,
          };
        }),
        page,
        pageSize,
        total,
      };
    }

    const where = { searchId, userId };
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          analysis: { select: { id: true, createdAt: true, categoryScores: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return {
      items: items.map((l) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        createdAt: l.createdAt.toISOString(),
        analysisId: l.analysis?.id ?? null,
        analyzedAt: l.analysis?.createdAt.toISOString() ?? null,
        avgScore: avgCategoryScore(l.analysis?.categoryScores),
      })),
      page,
      pageSize,
      total,
    };
  }

  async getCachedPage(userId: string, searchId: string, pageIndex: number) {
    const search = await this.prisma.savedSearch.findFirst({
      where: { id: searchId, userId },
      select: { id: true },
    });
    if (!search) {
      throw new NotFoundException("Search not found");
    }
    const row = await this.prisma.searchPageCache.findFirst({
      where: { searchId, pageIndex },
    });
    if (!row) {
      throw new NotFoundException("Cache miss");
    }
    if (row.userId !== userId) {
      throw new ForbiddenException();
    }
    return { pageIndex: row.pageIndex, rawPayload: row.rawPayload };
  }
}
