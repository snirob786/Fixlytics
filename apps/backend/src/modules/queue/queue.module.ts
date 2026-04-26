import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";
import { PrismaModule } from "../../prisma/prisma.module";
import { DomainModule } from "../domain/domain.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { GoogleModule } from "../google/google.module";
import { ParserModule } from "../parser/parser.module";
import { ScoringModule } from "../scoring/scoring.module";
import {
  ENRICHMENT_QUEUE,
  SEARCH_QUEUE,
} from "./queue.constants";
import { QueueService } from "./queue.service";
import { EnrichmentProcessor } from "./processors/enrichment.processor";
import { SearchProcessor } from "./processors/search.processor";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>("REDIS_URL"),
        },
      }),
    }),
    BullModule.registerQueue({ name: SEARCH_QUEUE }, { name: ENRICHMENT_QUEUE }),
    PrismaModule,
    GoogleModule,
    ParserModule,
    DomainModule,
    EnrichmentModule,
    ScoringModule,
  ],
  providers: [
    SearchPipelineConfigService,
    QueueService,
    SearchProcessor,
    EnrichmentProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
