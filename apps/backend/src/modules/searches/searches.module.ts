import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SearchesController } from "./searches.controller";
import { SearchesService } from "./searches.service";

// TODO: re-enable when async pipeline is reintroduced:
// import { PipelineModule } from "../jobs/pipeline.module";
// @Module({ imports: [PrismaModule, PipelineModule], ... })

@Module({
  imports: [PrismaModule],
  controllers: [SearchesController],
  providers: [SearchesService],
})
export class SearchesModule {}
