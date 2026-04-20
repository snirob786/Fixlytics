import { DynamicModule, Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PipelineModule } from "../jobs/pipeline.module";
import { SearchesController } from "./searches.controller";
import { SearchesService } from "./searches.service";

@Module({})
export class SearchesModule {
  static register(jobQueueEnabled: boolean): DynamicModule {
    return {
      module: SearchesModule,
      imports: jobQueueEnabled ? [PrismaModule, PipelineModule] : [PrismaModule],
      controllers: [SearchesController],
      providers: [SearchesService],
    };
  }
}
