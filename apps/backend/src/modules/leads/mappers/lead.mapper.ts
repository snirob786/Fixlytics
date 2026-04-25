import type { Analysis, Lead, SavedSearch, SearchSource } from "@prisma/client";

export type LeadSearchSummaryDto = {
  id: string;
  keyword: string;
  location: string;
  source: SearchSource;
};

export type LeadAnalysisSummaryDto = {
  id: string;
  createdAt: string;
  rawMetrics: unknown;
  categoryScores: unknown;
  checks: unknown;
};

export type LeadListItemResponseDto = {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
  analysisId: string | null;
  analyzedAt: string | null;
  avgScore: number | null;
  underperforming?: true;
};

export type LeadDetailResponseDto = {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
  search: LeadSearchSummaryDto;
  analysis: LeadAnalysisSummaryDto | null;
};

type LeadListRow = Lead & {
  analysis: {
    id: string;
    createdAt: Date;
    categoryScores: unknown;
    avgScore: number | null;
    isUnderperforming: boolean;
  } | null;
};

export function toLeadListItemResponse(
  lead: LeadListRow,
  opts?: { avgScore: number | null; underperforming?: true },
): LeadListItemResponseDto {
  const dto: LeadListItemResponseDto = {
    id: lead.id,
    url: lead.url,
    title: lead.title,
    createdAt: lead.createdAt.toISOString(),
    analysisId: lead.analysis?.id ?? null,
    analyzedAt: lead.analysis?.createdAt.toISOString() ?? null,
    avgScore: opts?.avgScore ?? null,
  };
  if (opts?.underperforming) {
    dto.underperforming = true;
  }
  return dto;
}

type LeadDetailRow = Lead & {
  analysis: Analysis | null;
  search: Pick<SavedSearch, "id" | "keyword" | "location" | "source">;
};

export function toLeadDetailResponse(lead: LeadDetailRow): LeadDetailResponseDto {
  return {
    id: lead.id,
    url: lead.url,
    title: lead.title,
    createdAt: lead.createdAt.toISOString(),
    search: {
      id: lead.search.id,
      keyword: lead.search.keyword,
      location: lead.search.location,
      source: lead.search.source,
    },
    analysis: lead.analysis
      ? {
          id: lead.analysis.id,
          createdAt: lead.analysis.createdAt.toISOString(),
          rawMetrics: lead.analysis.rawMetrics,
          categoryScores: lead.analysis.categoryScores,
          checks: lead.analysis.checks,
        }
      : null,
  };
}

export type LeadGlobalListItemDto = {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
  searchId: string;
};

export function toLeadGlobalListItem(lead: Lead): LeadGlobalListItemDto {
  return {
    id: lead.id,
    url: lead.url,
    title: lead.title,
    createdAt: lead.createdAt.toISOString(),
    searchId: lead.searchId,
  };
}
