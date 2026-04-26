import { Module } from "@nestjs/common";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";
import { PrismaModule } from "../../prisma/prisma.module";
import { QueueModule } from "../queue/queue.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [SearchController],
  providers: [SearchPipelineConfigService, SearchService],
})
export class SearchModule {}
