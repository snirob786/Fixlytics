import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { DAILY_JOB_RUN_LIMIT, PIPELINE_QUEUE, type ScrapeSearchJobData } from "./pipeline.constants";

@Injectable()
export class PipelineJobsService implements OnModuleInit {
  private readonly logger = new Logger(PipelineJobsService.name);

  constructor(
    @InjectQueue(PIPELINE_QUEUE) private readonly pipeline: Queue,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.pipeline.on("error", (err: Error) => {
      this.logger.warn(`Queue error: ${err.message}`);
    });
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

  async enqueueScrapeSearch(
    _userId: string,
    _searchId: string,
    _resume: boolean,
    _searchRunId: string,
  ): Promise<Job<ScrapeSearchJobData, unknown, string>> {
    throw new HttpException("Async pipeline disabled. Use /explore/search", HttpStatus.NOT_IMPLEMENTED);

    // TODO: re-enable when BullMQ pipeline is wired again
    // await this.assertQuota(userId);
    // const job = await this.pipeline.add(
    //   JOB_SCRAPE_SEARCH,
    //   { searchId, userId, resume, searchRunId } satisfies ScrapeSearchJobData,
    //   { removeOnComplete: 500, removeOnFail: 500 },
    // );
    // await this.recordJobRun(userId, JOB_SCRAPE_SEARCH);
    // return job;
  }

  async enqueueAnalyzeLead(_userId: string, _leadId: string): Promise<void> {
    throw new HttpException("Async pipeline disabled. Use /explore/search", HttpStatus.NOT_IMPLEMENTED);

    // TODO: re-enable when BullMQ pipeline is wired again
    // await this.pipeline.add(
    //   JOB_ANALYZE_LEAD,
    //   { leadId, userId } satisfies AnalyzeLeadJobData,
    //   { removeOnComplete: 500, removeOnFail: 500 },
    // );
  }
}
