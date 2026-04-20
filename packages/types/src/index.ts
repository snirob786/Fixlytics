export type UserPublic = {
  id: string;
  email: string;
};

/** JSON body from login/register/refresh; access and refresh tokens are HttpOnly cookies. */
export type AuthSessionResponse = {
  user: UserPublic;
};

/** @deprecated Prefer AuthSessionResponse — tokens are no longer returned in JSON. */
export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
};

export type ApiErrorBody = {
  statusCode: number;
  path: string;
  message: string | string[];
};

export const SEARCH_SOURCES = ["GOOGLE", "MAPS", "DIRECTORY"] as const;
export type SearchSource = (typeof SEARCH_SOURCES)[number];

export type SavedSearchListItem = {
  id: string;
  keyword: string;
  location: string;
  source: SearchSource;
  cursorPage: number | null;
  createdAt: string;
  updatedAt: string;
  leadCount: number;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type SavedSearchDetail = {
  id: string;
  keyword: string;
  location: string;
  source: SearchSource;
  cursorPage: number | null;
  createdAt: string;
  updatedAt: string;
  leadCount: number;
  cachedPages: number;
};

export type LeadListItem = {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
  analysisId: string | null;
  analyzedAt: string | null;
};

export type LeadDetailResponse = {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
  search: {
    id: string;
    keyword: string;
    location: string;
    source: SearchSource;
  };
  analysis: {
    id: string;
    createdAt: string;
    rawMetrics: Record<string, unknown>;
    categoryScores: {
      seo: number;
      performance: number;
      design: number;
    };
    checks: Record<string, unknown>;
  } | null;
};
