import { ForbiddenException, HttpException, HttpStatus } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
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
    lead: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  let service: SearchesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [SearchesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SearchesService);
  });

  it("enqueueRun returns 501 while pipeline is disabled", async () => {
    prisma.savedSearch.findFirst.mockResolvedValue({ id: "s1", userId: "u1" } as never);
    const err = await service.enqueueRun("u1", "s1", false).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_IMPLEMENTED);
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

  it("listLeads uses Prisma relation filter for underperformingOnly", async () => {
    prisma.savedSearch.findFirst.mockResolvedValueOnce({ id: "s1", userId: "u1" } as never);
    prisma.lead.findMany.mockResolvedValueOnce([
      {
        id: "l1",
        searchId: "s1",
        userId: "u1",
        url: "https://a.test",
        title: "A",
        createdAt: new Date("2026-01-01"),
        analysis: {
          id: "a1",
          createdAt: new Date("2026-01-01"),
          categoryScores: { seo: 40, performance: 40, design: 40 },
          avgScore: 40,
          isUnderperforming: true,
        },
      },
    ] as never);
    prisma.lead.count.mockResolvedValueOnce(1 as never);

    const res = await service.listLeads("u1", "s1", {
      page: 1,
      pageSize: 10,
      underperformingOnly: true,
    });

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          searchId: "s1",
          userId: "u1",
          analysis: { isUnderperforming: true },
        }),
      }),
    );
    expect(res.items[0]?.underperforming).toBe(true);
    expect(res.items[0]?.avgScore).toBe(40);
  });
});
