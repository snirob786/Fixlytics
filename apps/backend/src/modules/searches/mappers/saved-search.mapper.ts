import type { SavedSearch, SearchSource } from "@prisma/client";

export type SavedSearchResponseDto = {
  id: string;
  keyword: string;
  location: string;
  source: SearchSource;
  cursorPage: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedSearchSummaryResponseDto = SavedSearchResponseDto & {
  leadCount: number;
};

export type SavedSearchDetailResponseDto = SavedSearchResponseDto & {
  leadCount: number;
  cachedPages: number;
};

type SavedSearchWithLeadCount = SavedSearch & { _count: { leads: number } };
type SavedSearchWithCounts = SavedSearch & { _count: { leads: number; caches: number } };

export function toSavedSearchResponse(entity: SavedSearch): SavedSearchResponseDto {
  return {
    id: entity.id,
    keyword: entity.keyword,
    location: entity.location,
    source: entity.source,
    cursorPage: entity.cursorPage,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toSavedSearchSummaryResponse(entity: SavedSearchWithLeadCount): SavedSearchSummaryResponseDto {
  return {
    ...toSavedSearchResponse(entity),
    leadCount: entity._count.leads,
  };
}

/** Newly created searches have no leads yet. */
export function toSavedSearchCreateResponse(entity: SavedSearch): SavedSearchSummaryResponseDto {
  return {
    ...toSavedSearchResponse(entity),
    leadCount: 0,
  };
}

export function toSavedSearchDetailResponse(entity: SavedSearchWithCounts): SavedSearchDetailResponseDto {
  return {
    ...toSavedSearchResponse(entity),
    leadCount: entity._count.leads,
    cachedPages: entity._count.caches,
  };
}
