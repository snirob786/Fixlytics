import { Logger, OnApplicationBootstrap } from "@nestjs/common";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import type { Prisma } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { AnalyzerService } from "../analyzer/analyzer.service";
import { ScraperService } from "../scraper/scraper.service";
import {
  JOB_ANALYZE_LEAD,
  JOB_SCRAPE_SEARCH,
  PIPELINE_QUEUE,
  type AnalyzeLeadJobData,
  type ScrapeSearchJobData,
} from "./pipeline.constants";
import { PipelineJobsService } from "./pipeline-jobs.service";

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
    this.worker.on("error", () => {});
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, err: Error): void {
    this.logger.warn(`Job ${job?.name ?? "?"} ${job?.id ?? "?"} failed: ${err.message}`);
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

  private async handleScrape(job: Job<ScrapeSearchJobData>): Promise<void> {
    const { searchId, userId, resume } = job.data;
    const search = await this.prisma.savedSearch.findFirst({
      where: { id: searchId, userId },
    });
    if (!search) {
      this.logger.warn(`Scrape skipped: search ${searchId} not found for user`);
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

    for (const l of leads) {
      const lead = await this.prisma.lead.upsert({
        where: { searchId_url: { searchId, url: l.url } },
        create: { searchId, userId, url: l.url, title: l.title },
        update: { title: l.title ?? undefined },
      });
      const hasAnalysis = await this.prisma.analysis.findUnique({
        where: { leadId: lead.id },
        select: { id: true },
      });
      if (!hasAnalysis) {
        await this.pipelineJobs.enqueueAnalyzeLead(userId, lead.id);
      }
    }

    const nextPage = pageIndex + 1;
    await this.prisma.savedSearch.update({
      where: { id: searchId },
      data: { cursorPage: nextPage },
    });
  }

  private async handleAnalyze(job: Job<AnalyzeLeadJobData>): Promise<void> {
    const { leadId, userId } = job.data;
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

    await this.prisma.analysis.upsert({
      where: { leadId },
      create: {
        leadId,
        userId,
        scrapedPayload: scrapedPayload as Prisma.InputJsonValue,
        rawMetrics: rawMetrics as Prisma.InputJsonValue,
        categoryScores: categoryScores as Prisma.InputJsonValue,
        checks: checks as Prisma.InputJsonValue,
      },
      update: {
        scrapedPayload: scrapedPayload as Prisma.InputJsonValue,
        rawMetrics: rawMetrics as Prisma.InputJsonValue,
        categoryScores: categoryScores as Prisma.InputJsonValue,
        checks: checks as Prisma.InputJsonValue,
      },
    });
  }
}
