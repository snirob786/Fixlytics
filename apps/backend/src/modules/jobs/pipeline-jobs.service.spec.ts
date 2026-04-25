import { HttpException, HttpStatus } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PIPELINE_QUEUE } from "./pipeline.constants";
import { PipelineJobsService } from "./pipeline-jobs.service";

describe("PipelineJobsService", () => {
  it("enqueueScrapeSearch is disabled (501) while async pipeline is off", async () => {
    const prisma = {
      jobRun: {
        count: jest.fn(),
      },
    };
    const queue = { add: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PipelineJobsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(PIPELINE_QUEUE), useValue: queue },
      ],
    }).compile();

    const service = moduleRef.get(PipelineJobsService);
    const err = await service
      .enqueueScrapeSearch("u1", "s1", true, `c${"a".repeat(24)}`)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_IMPLEMENTED);
    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.jobRun.count).not.toHaveBeenCalled();
  });
});
