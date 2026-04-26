import { Module } from "@nestjs/common";
import { SearchPipelineConfigService } from "../../config/search-pipeline.config";
import { GoogleService } from "./google.service";

@Module({
  providers: [SearchPipelineConfigService, GoogleService],
  exports: [GoogleService],
})
export class GoogleModule {}
