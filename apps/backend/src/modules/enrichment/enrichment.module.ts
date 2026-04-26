import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { EnrichmentService } from "./enrichment.service";

@Module({
  imports: [PrismaModule],
  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
