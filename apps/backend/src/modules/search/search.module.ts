import { Module } from "@nestjs/common";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";
import { DomainModule } from "../domain/domain.module";
import { GoogleModule } from "../google/google.module";
import { ParserModule } from "../parser/parser.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [PrismaModule, GoogleModule, ParserModule, DomainModule],
  controllers: [SearchController],
  providers: [SearchPipelineConfigService, SearchService],
})
export class SearchModule {}
