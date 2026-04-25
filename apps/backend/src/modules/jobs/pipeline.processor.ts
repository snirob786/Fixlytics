import { Logger, OnApplicationBootstrap } from "@nestjs/common";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import type { Prisma } from "@prisma/client";
import { SearchRunStatus } from "@prisma/client";
import { Job } from "bullmq";
import { UNDERPERFORMING_SCORE_THRESHOLD } from "../../common/constants/scoring";
import { PrismaService } from "../../prisma/prisma.service";
import { AnalyzerService } from "../analyzer/analyzer.service";
import { ScraperService } from "../scraper/scraper.service";
import {
  JOB_ANALYZE_LEAD,
  JOB_SCRAPE_SEARCH,
  MAX_ANALYZE_ENQUEUE_PER_SCRAPE_ITERATION,
  MAX_LEADS_PER_SCRAPE_ITERATION,
  MAX_SEARCH_RUN_ERROR_LENGTH,
  PIPELINE_QUEUE,
  type AnalyzeLeadJobData,
  type ScrapeSearchJobData,
} from "./pipeline.constants";
import { PipelineJobsService } from "./pipeline-jobs.service";

function truncateRunError(message: string): string {
  const m = message.trim();
  if (m.length <= MAX_SEARCH_RUN_ERROR_LENGTH) return m;
  return `${m.slice(0, MAX_SEARCH_RUN_ERROR_LENGTH - 1)}…`;
}

@Processor(PIPELINE_QUEUE)
export class PipelineProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: ScraperService,
    private readonly analyzer: AnalyzerService,
    private readonly pipelineJobs: PipelineJobsService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.on("error", (err: Error) => {
      this.logger.warn(`Worker error: ${err.message}`);
    });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, err: Error): void {
    this.logger.warn(
      `jobId=${job?.id ?? "?"} name=${job?.name ?? "?"} searchId=${(job?.data as ScrapeSearchJobData | undefined)?.searchId ?? "?"} failed: ${err.message}`,
    );
  }

  override async process(job: Job<ScrapeSearchJobData | AnalyzeLeadJobData>): Promise<void> {
    if (job.name === JOB_SCRAPE_SEARCH) {
      await this.handleScrape(job as Job<ScrapeSearchJobData>);
      return;
    }
    if (job.name === JOB_ANALYZE_LEAD) {
      await this.handleAnalyze(job as Job<AnalyzeLeadJobData>);
      return;
    }
    throw new Error(`Unknown job name: ${job.name}`);
  }

  private async setRunStatus(
    searchRunId: string,
    patch: {
      status: SearchRunStatus;
      startedAt?: Date | null;
      finishedAt?: Date | null;
      error?: string | null;
    },
  ): Promise<void> {
    await this.prisma.searchRun.update({
      where: { id: searchRunId },
      data: {
        status: patch.status,
        ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
        ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
        ...(patch.error !== undefined ? { error: patch.error } : {}),
      },
    });
  }

  private async handleScrape(job: Job<ScrapeSearchJobData>): Promise<void> {
    const { searchId, userId, resume, searchRunId } = job.data;
    const jobIdStr = job.id != null ? String(job.id) : "?";

    this.logger.log(
      `scrape jobId=${jobIdStr} searchRunId=${searchRunId} searchId=${searchId} status→RUNNING`,
    );

    try {
      await this.setRunStatus(searchRunId, {
        status: SearchRunStatus.RUNNING,
        startedAt: new Date(),
      });
    } catch (e) {
      this.logger.warn(`searchRun ${searchRunId} could not transition to RUNNING: ${String(e)}`);
    }

    try {
      const search = await this.prisma.savedSearch.findFirst({
        where: { id: searchId, userId },
      });
      if (!search) {
        this.logger.warn(`Scrape skipped: search ${searchId} not found for user`);
        await this.setRunStatus(searchRunId, {
          status: SearchRunStatus.FAILED,
          finishedAt: new Date(),
          error: truncateRunError("Search not found for user"),
        });
        return;
      }

      const pageIndex = resume ? (search.cursorPage ?? 0) : 0;

      const existing = await this.prisma.searchPageCache.findUnique({
        where: { searchId_pageIndex: { searchId, pageIndex } },
      });
      if (existing && existing.userId !== userId) {
        throw new Error("Cache user mismatch");
      }

      let rawPayload: Record<string, unknown>;
      let leads: { url: string; title: string | null }[];

      if (existing) {
        rawPayload = existing.rawPayload as Record<string, unknown>;
        const results = Array.isArray(rawPayload.results)
          ? (rawPayload.results as { url?: string; title?: string | null }[])
          : [];
        leads = results
          .filter((r) => typeof r.url === "string")
          .map((r) => ({ url: r.url as string, title: r.title ?? null }));
      } else {
        const scraped = await this.scraper.scrapeSearchPage(search, pageIndex);
        rawPayload = scraped.rawPayload;
        leads = scraped.leads;
        await this.prisma.searchPageCache.create({
          data: {
            searchId,
            userId,
            pageIndex,
            rawPayload: rawPayload as Prisma.InputJsonValue,
          },
        });
      }

      const cappedLeads = leads.slice(0, MAX_LEADS_PER_SCRAPE_ITERATION);
      if (cappedLeads.length < leads.length) {
        this.logger.warn(
          `searchId=${searchId} pageIndex=${pageIndex}: capped leads ${leads.length}→${cappedLeads.length}`,
        );
      }

      let analyzeEnqueued = 0;
      let analyzeSkippedCap = 0;
      for (const l of cappedLeads) {
        const leadRow = await this.prisma.lead.upsert({
          where: { searchId_url: { searchId, url: l.url } },
          create: { searchId, userId, url: l.url, title: l.title },
          update: { title: l.title ?? undefined },
        });
        const hasAnalysis = await this.prisma.analysis.findUnique({
          where: { leadId: leadRow.id },
          select: { id: true },
        });
        if (hasAnalysis) {
          continue;
        }
        if (analyzeEnqueued < MAX_ANALYZE_ENQUEUE_PER_SCRAPE_ITERATION) {
          await this.pipelineJobs.enqueueAnalyzeLead(userId, leadRow.id);
          analyzeEnqueued += 1;
        } else {
          analyzeSkippedCap += 1;
        }
      }
      if (analyzeSkippedCap > 0) {
        this.logger.warn(
          `searchId=${searchId}: analyze enqueue cap (${MAX_ANALYZE_ENQUEUE_PER_SCRAPE_ITERATION}) skipped ${analyzeSkippedCap} lead(s)`,
        );
      }

      const nextPage = pageIndex + 1;
      await this.prisma.savedSearch.update({
        where: { id: searchId },
        data: { cursorPage: nextPage },
      });

      await this.setRunStatus(searchRunId, {
        status: SearchRunStatus.COMPLETED,
        finishedAt: new Date(),
        error: null,
      });
      this.logger.log(`scrape jobId=${jobIdStr} searchRunId=${searchRunId} status→COMPLETED`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`scrape jobId=${jobIdStr} searchRunId=${searchRunId} error: ${message}`);
      try {
        await this.setRunStatus(searchRunId, {
          status: SearchRunStatus.FAILED,
          finishedAt: new Date(),
          error: truncateRunError(message),
        });
      } catch (e) {
        this.logger.warn(`searchRun ${searchRunId} could not mark FAILED: ${String(e)}`);
      }
    }
  }

  private async handleAnalyze(job: Job<AnalyzeLeadJobData>): Promise<void> {
    const { leadId, userId } = job.data;
    this.logger.log(`analyze jobId=${job.id != null ? String(job.id) : "?"} leadId=${leadId}`);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, userId },
    });
    if (!lead) {
      this.logger.warn(`Analyze skipped: lead ${leadId} not found for user`);
      return;
    }

    const scrapedPayload: Record<string, unknown> = {
      mode: "fixture",
      title: lead.title,
      leadUrl: lead.url,
    };

    const { rawMetrics, categoryScores, checks } = this.analyzer.analyze(scrapedPayload, lead.url);
    const avgScore =
      (categoryScores.seo + categoryScores.performance + categoryScores.design) / 3;
    const isUnderperforming = avgScore < UNDERPERFORMING_SCORE_THRESHOLD;

    await this.prisma.analysis.upsert({
      where: { leadId },
      create: {
        leadId,
        userId,
        scrapedPayload: scrapedPayload as Prisma.InputJsonValue,
        rawMetrics: rawMetrics as Prisma.InputJsonValue,
        categoryScores: categoryScores as Prisma.InputJsonValue,
        checks: checks as Prisma.InputJsonValue,
        avgScore,
        isUnderperforming,
      },
      update: {
        scrapedPayload: scrapedPayload as Prisma.InputJsonValue,
        rawMetrics: rawMetrics as Prisma.InputJsonValue,
        categoryScores: categoryScores as Prisma.InputJsonValue,
        checks: checks as Prisma.InputJsonValue,
        avgScore,
        isUnderperforming,
      },
    });
  }
}
