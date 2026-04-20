import { HttpException, HttpStatus, Injectable, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DAILY_JOB_RUN_LIMIT,
  JOB_ANALYZE_LEAD,
  JOB_SCRAPE_SEARCH,
  PIPELINE_QUEUE,
  type AnalyzeLeadJobData,
  type ScrapeSearchJobData,
} from "./pipeline.constants";

@Injectable()
export class PipelineJobsService implements OnModuleInit {
  constructor(
    @InjectQueue(PIPELINE_QUEUE) private readonly pipeline: Queue,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.pipeline.on("error", () => {});
  }

  private startOfUtcDay(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async assertQuota(userId: string): Promise<void> {
    const count = await this.prisma.jobRun.count({
      where: { userId, createdAt: { gte: this.startOfUtcDay() } },
    });
    if (count >= DAILY_JOB_RUN_LIMIT) {
      throw new HttpException("Daily job quota exceeded", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordJobRun(userId: string, kind: string): Promise<void> {
    await this.prisma.jobRun.create({ data: { userId, kind } });
  }

  async enqueueScrapeSearch(userId: string, searchId: string, resume: boolean): Promise<void> {
    await this.assertQuota(userId);
    await this.pipeline.add(
      JOB_SCRAPE_SEARCH,
      { searchId, userId, resume } satisfies ScrapeSearchJobData,
      { removeOnComplete: 500, removeOnFail: 500 },
    );
    await this.recordJobRun(userId, JOB_SCRAPE_SEARCH);
  }

  async enqueueAnalyzeLead(userId: string, leadId: string): Promise<void> {
    await this.pipeline.add(
      JOB_ANALYZE_LEAD,
      { leadId, userId } satisfies AnalyzeLeadJobData,
      { removeOnComplete: 500, removeOnFail: 500 },
    );
  }
}
