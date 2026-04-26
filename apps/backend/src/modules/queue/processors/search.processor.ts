import { Processor, WorkerHost } from "@nestjs/bullmq";
import { SearchPipelineStatus } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { DomainService } from "../../domain/domain.service";
import { GoogleService } from "../../google/google.service";
import { ParserService } from "../../parser/parser.service";
import { QueueService } from "../queue.service";
import { SEARCH_JOB, SEARCH_QUEUE, type SearchJobData } from "../queue.constants";

@Processor(SEARCH_QUEUE)
export class SearchProcessor extends WorkerHost {
  constructor(
    private readonly google: GoogleService,
    private readonly parser: ParserService,
    private readonly domainService: DomainService,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  override async process(job: Job<SearchJobData>): Promise<void> {
    if (job.name !== SEARCH_JOB) return;
    try {
      const response = await this.google.search(job.data.query, {
        platform: job.data.platform,
        area: job.data.area,
      });
      const parsed = this.parser.parseGoogle(response.items ?? []);

      await this.prisma.searchResult.deleteMany({ where: { searchId: job.data.searchId } });
      for (const item of parsed) {
        const domain = await this.domainService.upsertDomain(item.domain, item.rootDomain);
        await this.prisma.searchResult.create({
          data: {
            searchId: job.data.searchId,
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            position: item.position,
            domainId: domain.id,
          },
        });
      }
      await this.prisma.search.update({
        where: { id: job.data.searchId },
        data: {
          status: SearchPipelineStatus.READY,
          error: null,
          lastFetchedAt: new Date(),
        },
      });

      for (const item of parsed) {
        const domain = await this.prisma.domain.findUnique({
          where: { domain: item.domain },
          select: { id: true },
        });
        if (domain) {
          await this.queueService.enqueueEnrichment({
            domainId: domain.id,
            keyword: job.data.keyword,
            area: job.data.area,
          });
        }
      }
    } catch (error) {
      await this.prisma.search.update({
        where: { id: job.data.searchId },
        data: {
          status: SearchPipelineStatus.FAILED,
          error: error instanceof Error ? error.message.slice(0, 500) : "search processing failed",
        },
      });
      throw error;
    }
  }
}
