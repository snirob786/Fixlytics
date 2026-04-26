import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DomainService } from "./domain.service";

@Module({
  imports: [PrismaModule],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
