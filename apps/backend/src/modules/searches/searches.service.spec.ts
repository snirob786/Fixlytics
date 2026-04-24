import { ConflictException, ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SearchRunStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PipelineJobsService } from "../jobs/pipeline-jobs.service";
import { SearchesService } from "./searches.service";

describe("SearchesService", () => {
  const prisma = {
    savedSearch: {
      findFirst: jest.fn(),
    },
    searchPageCache: {
      findFirst: jest.fn(),
    },
    searchRun: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const pipelineJobs = {
    assertQuota: jest.fn().mockResolvedValue(undefined),
    enqueueScrapeSearch: jest.fn(),
  };

  let service: SearchesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PipelineJobsService, useValue: pipelineJobs },
      ],
    }).compile();
    service = moduleRef.get(SearchesService);
  });

  it("returns 503 when the job queue is not wired", async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SearchesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const svc = moduleRef.get(SearchesService);
    prisma.savedSearch.findFirst.mockResolvedValueOnce({ id: "s1", userId: "u1" } as never);
    await expect(svc.enqueueRun("u1", "s1", false)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("throws Conflict when a run is already queued or running", async () => {
    prisma.savedSearch.findFirst.mockResolvedValueOnce({ id: "s1", userId: "u1" } as never);
    prisma.searchRun.findFirst.mockResolvedValueOnce({ id: "run-block" } as never);
    await expect(service.enqueueRun("u1", "s1", false)).rejects.toBeInstanceOf(ConflictException);
    expect(pipelineJobs.enqueueScrapeSearch).not.toHaveBeenCalled();
  });

  it("rejects cache rows that do not match the authenticated user", async () => {
    prisma.savedSearch.findFirst.mockResolvedValueOnce({ id: "s1" });
    prisma.searchPageCache.findFirst.mockResolvedValueOnce({
      userId: "other-user",
      pageIndex: 0,
      rawPayload: {},
    });
    await expect(service.getCachedPage("u1", "s1", 0)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns cache payload when ownership matches (not truncated)", async () => {
    prisma.savedSearch.findFirst.mockResolvedValueOnce({ id: "s1" });
    prisma.searchPageCache.findFirst.mockResolvedValueOnce({
      userId: "u1",
      pageIndex: 0,
      rawPayload: { ok: true },
    });
    const res = await service.getCachedPage("u1", "s1", 0);
    expect(res).toEqual({ pageIndex: 0, truncated: false, rawPayload: { ok: true } });
  });

  it("marks run failed and rethrows when enqueue fails", async () => {
    prisma.savedSearch.findFirst.mockResolvedValue({ id: "s1", userId: "u1" } as never);
    prisma.searchRun.findFirst.mockResolvedValue(null);
    prisma.searchRun.create.mockResolvedValue({ id: "run1" } as never);
    pipelineJobs.enqueueScrapeSearch.mockRejectedValueOnce(new Error("redis down"));
    await expect(service.enqueueRun("u1", "s1", false)).rejects.toThrow("redis down");
    expect(prisma.searchRun.update).toHaveBeenCalledWith({
      where: { id: "run1" },
      data: expect.objectContaining({
        status: SearchRunStatus.FAILED,
        error: expect.stringContaining("redis down"),
      }),
    });
  });
});
