import { HttpException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PIPELINE_QUEUE } from "./pipeline.constants";
import { PipelineJobsService } from "./pipeline-jobs.service";

describe("PipelineJobsService", () => {
  it("blocks user-triggered scrapes when the daily quota is exhausted", async () => {
    const prisma = {
      jobRun: {
        count: jest.fn().mockResolvedValue(100),
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
    try {
      await service.enqueueScrapeSearch("u1", "s1", true, `c${"a".repeat(24)}`);
      throw new Error("expected HttpException");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(429);
    }
    expect(queue.add).not.toHaveBeenCalled();
  });
});
