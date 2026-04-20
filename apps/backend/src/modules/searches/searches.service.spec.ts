import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
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
  };
  const pipelineJobs = {
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

  it("clamps list page size to max", () => {
    expect(service.normalizeListQuery({ page: 1, pageSize: 999 } as never)).toEqual({
      page: 1,
      pageSize: 50,
      recent: false,
    });
  });

  it("uses page size 5 by default when recent is true", () => {
    expect(service.normalizeListQuery({ page: 1, recent: true } as never)).toEqual({
      page: 1,
      pageSize: 5,
      recent: true,
    });
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

  it("returns cache when ownership matches", async () => {
    prisma.savedSearch.findFirst.mockResolvedValueOnce({ id: "s1" });
    prisma.searchPageCache.findFirst.mockResolvedValueOnce({
      userId: "u1",
      pageIndex: 0,
      rawPayload: { ok: true },
    });
    const res = await service.getCachedPage("u1", "s1", 0);
    expect(res.rawPayload).toEqual({ ok: true });
  });
});
