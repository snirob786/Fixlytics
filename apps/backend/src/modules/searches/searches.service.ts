import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, SearchRunStatus, type SavedSearch } from "@prisma/client";
import { buildPaginated, type PaginatedResponse } from "../../common/dto/paginated-response";
import { PrismaService } from "../../prisma/prisma.service";
import { PipelineJobsService } from "../jobs/pipeline-jobs.service";
import { MAX_SEARCH_RUN_ERROR_LENGTH } from "../jobs/pipeline.constants";
import { toCachedPageResponse } from "./mappers/cache-page.mapper";
import {
  toLeadListItemResponse,
  type LeadListItemResponseDto,
} from "../leads/mappers/lead.mapper";
import {
  toSavedSearchCreateResponse,
  toSavedSearchDetailResponse,
  toSavedSearchResponse,
  toSavedSearchSummaryResponse,
  type SavedSearchDetailResponseDto,
  type SavedSearchResponseDto,
  type SavedSearchSummaryResponseDto,
} from "./mappers/saved-search.mapper";
import { toSearchRunResponse, type SearchRunResponseDto } from "./mappers/search-run.mapper";
import { CreateSearchDto } from "./dto/create-search.dto";
import { normalizeSavedSearchListQuery, type ListSavedSearchesQuery } from "./dto/list-saved-searches.query";
import { normalizeSearchLeadsQuery, type ListSearchLeadsQuery } from "./dto/list-search-leads.query";
import { normalizeSearchRunsQuery, type ListSearchRunsQuery } from "./dto/list-search-runs.query";
import { UpdateSearchDto } from "./dto/update-search.dto";

const UNDERPERFORMING_AVG_THRESHOLD = 58;

function truncateRunError(message: string): string {
  const m = message.trim();
  if (m.length <= MAX_SEARCH_RUN_ERROR_LENGTH) return m;
  return `${m.slice(0, MAX_SEARCH_RUN_ERROR_LENGTH - 1)}…`;
}

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

  async create(userId: string, dto: CreateSearchDto): Promise<SavedSearchSummaryResponseDto> {
    const row = await this.prisma.savedSearch.create({
      data: {
        userId,
        keyword: dto.keyword.trim(),
        location: dto.location.trim(),
        source: dto.source,
      },
    });
    return toSavedSearchCreateResponse(row);
  }

  async list(
    userId: string,
    query: ListSavedSearchesQuery,
  ): Promise<PaginatedResponse<SavedSearchSummaryResponseDto>> {
    const { page, pageSize } = normalizeSavedSearchListQuery(query);
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
    return buildPaginated(
      items.map((s) => toSavedSearchSummaryResponse(s)),
      page,
      pageSize,
      total,
    );
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

  async getDetail(userId: string, id: string): Promise<SavedSearchDetailResponseDto> {
    const search = await this.prisma.savedSearch.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { leads: true, caches: true } },
      },
    });
    if (!search) {
      throw new NotFoundException("Search not found");
    }
    return toSavedSearchDetailResponse(search);
  }

  async update(userId: string, id: string, dto: UpdateSearchDto): Promise<SavedSearchResponseDto> {
    await this.getOwnedOrThrow(userId, id);
    const row = await this.prisma.savedSearch.update({
      where: { id },
      data: {
        ...(dto.keyword !== undefined ? { keyword: dto.keyword.trim() } : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
      },
    });
    return toSavedSearchResponse(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
  }

  async enqueueRun(userId: string, id: string, resume: boolean): Promise<{ runId: string }> {
    await this.getOwnedOrThrow(userId, id);
    if (!this.pipelineJobs) {
      throw new ServiceUnavailableException(
        "Job queue is disabled (set USE_JOB_QUEUE=true and REDIS_URL, then restart). Saved searches are still stored in the database.",
      );
    }

    const blocking = await this.prisma.searchRun.findFirst({
      where: {
        searchId: id,
        status: { in: [SearchRunStatus.QUEUED, SearchRunStatus.RUNNING] },
      },
    });
    if (blocking) {
      throw new ConflictException(
        "A scrape run is already queued or in progress for this search. Wait for it to finish or fail before starting another.",
      );
    }

    await this.pipelineJobs.assertQuota(userId);

    const run = await this.prisma.searchRun.create({
      data: { searchId: id, status: SearchRunStatus.QUEUED },
    });

    try {
      const job = await this.pipelineJobs.enqueueScrapeSearch(userId, id, resume, run.id);
      await this.prisma.searchRun.update({
        where: { id: run.id },
        data: { jobId: job.id != null ? String(job.id) : null },
      });
      return { runId: run.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.searchRun.update({
        where: { id: run.id },
        data: {
          status: SearchRunStatus.FAILED,
          finishedAt: new Date(),
          error: truncateRunError(msg),
        },
      });
      throw err;
    }
  }

  async getLatestRunStatus(
    userId: string,
    searchId: string,
  ): Promise<{ latestRun: SearchRunResponseDto | null }> {
    await this.getOwnedOrThrow(userId, searchId);
    const latest = await this.prisma.searchRun.findFirst({
      where: { searchId },
      orderBy: { createdAt: "desc" },
    });
    return { latestRun: latest ? toSearchRunResponse(latest) : null };
  }

  async listSearchRuns(
    userId: string,
    searchId: string,
    query: ListSearchRunsQuery,
  ): Promise<PaginatedResponse<SearchRunResponseDto>> {
    await this.getOwnedOrThrow(userId, searchId);
    const { page, pageSize } = normalizeSearchRunsQuery(query);
    const where = { searchId };
    const [rows, total] = await Promise.all([
      this.prisma.searchRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.searchRun.count({ where }),
    ]);
    return buildPaginated(
      rows.map((r) => toSearchRunResponse(r)),
      page,
      pageSize,
      total,
    );
  }

  async listLeads(
    userId: string,
    searchId: string,
    query: ListSearchLeadsQuery,
  ): Promise<PaginatedResponse<LeadListItemResponseDto>> {
    await this.getOwnedOrThrow(userId, searchId);
    const { page, pageSize, underperformingOnly } = normalizeSearchLeadsQuery(query);
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
        return buildPaginated([], page, pageSize, total);
      }
      const leads = await this.prisma.lead.findMany({
        where: { id: { in: ids }, userId, searchId },
        include: {
          analysis: { select: { id: true, createdAt: true, categoryScores: true } },
        },
      });
      const order = new Map(ids.map((rid, i) => [rid, i] as const));
      leads.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      return buildPaginated(
        leads.map((l) => {
          const avg = avgCategoryScore(l.analysis?.categoryScores);
          return toLeadListItemResponse(l, { avgScore: avg, underperforming: true });
        }),
        page,
        pageSize,
        total,
      );
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
    return buildPaginated(
      items.map((l) =>
        toLeadListItemResponse(l, { avgScore: avgCategoryScore(l.analysis?.categoryScores) }),
      ),
      page,
      pageSize,
      total,
    );
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
    return toCachedPageResponse(row.pageIndex, row.rawPayload);
  }
}
