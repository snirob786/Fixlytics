import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  ENRICHMENT_QUEUE,
  ENRICH_DOMAIN_JOB,
  SEARCH_JOB,
  SEARCH_QUEUE,
  type EnrichmentJobData,
  type SearchJobData,
} from "./queue.constants";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(SEARCH_QUEUE) private readonly searchQueue: Queue,
    @InjectQueue(ENRICHMENT_QUEUE) private readonly enrichmentQueue: Queue,
  ) {}

  async enqueueSearch(data: SearchJobData): Promise<void> {
    await this.searchQueue.add(SEARCH_JOB, data, {
      jobId: data.hash,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  async enqueueEnrichment(data: EnrichmentJobData): Promise<void> {
    await this.enrichmentQueue.add(ENRICH_DOMAIN_JOB, data, {
      jobId: data.domainId,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }
}
