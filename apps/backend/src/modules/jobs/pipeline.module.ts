import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AnalyzerModule } from "../analyzer/analyzer.module";
import { ScraperModule } from "../scraper/scraper.module";
import { PIPELINE_QUEUE } from "./pipeline.constants";
import { PipelineJobsService } from "./pipeline-jobs.service";
import { PipelineProcessor } from "./pipeline.processor";

@Module({
  imports: [
    PrismaModule,
    ScraperModule,
    AnalyzerModule,
    BullModule.registerQueue({ name: PIPELINE_QUEUE }),
  ],
  providers: [PipelineJobsService, PipelineProcessor],
  exports: [PipelineJobsService],
})
export class PipelineModule {}
