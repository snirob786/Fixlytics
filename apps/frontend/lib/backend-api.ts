import type {
  AuthSessionResponse,
  LeadDetailResponse,
  LeadListItem,
  Paginated,
  SavedSearchDetail,
  SavedSearchListItem,
  SearchSource,
  UserPublic,
} from "@fixlytics/types";

export type LeadGlobalListItem = {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
  searchId: string;
};

export type LeadsGlobalListResponse = {
  items: LeadGlobalListItem[];
  hasNext: boolean;
  nextCursor: string | null;
};

import { fetchJson } from "./api-client";

export type HealthResponse = {
  status: string;
  service: string;
};

export async function getHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export type LoginBody = { email: string; password: string };
export type RegisterBody = LoginBody;
export type RefreshBody = { refreshToken?: string };

export async function authRegister(body: RegisterBody): Promise<AuthSessionResponse> {
  return fetchJson<AuthSessionResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function authLogin(body: LoginBody): Promise<AuthSessionResponse> {
  return fetchJson<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function authRefresh(body: RefreshBody = {}): Promise<AuthSessionResponse> {
  return fetchJson<AuthSessionResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function authLogout(body: RefreshBody = {}): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function authMe(): Promise<UserPublic> {
  return fetchJson<UserPublic>("/auth/me");
}

export type ListSearchesParams = {
  page?: number;
  pageSize?: number;
};

function listSearchesQueryString(query: ListSearchesParams): string {
  const p = new URLSearchParams();
  if (query.page !== undefined) p.set("page", String(query.page));
  if (query.pageSize !== undefined) p.set("pageSize", String(query.pageSize));
  return p.toString();
}

export type ListSearchLeadsParams = {
  page?: number;
  pageSize?: number;
  underperformingOnly?: boolean;
};

function listSearchLeadsQueryString(query: ListSearchLeadsParams): string {
  const p = new URLSearchParams();
  if (query.page !== undefined) p.set("page", String(query.page));
  if (query.pageSize !== undefined) p.set("pageSize", String(query.pageSize));
  if (query.underperformingOnly !== undefined) {
    p.set("underperformingOnly", String(query.underperformingOnly));
  }
  return p.toString();
}

export type CreateSearchBody = {
  keyword: string;
  location: string;
  source: SearchSource;
};

export type UpdateSearchBody = {
  keyword?: string;
  location?: string;
  source?: SearchSource;
};

export type SearchCachedPageResponse =
  | { pageIndex: number; truncated: false; rawPayload: unknown }
  | {
      pageIndex: number;
      truncated: true;
      approximateSizeBytes: number;
      preview: string;
      warning: string;
    };

export async function searchesList(
  query: ListSearchesParams = {},
): Promise<Paginated<SavedSearchListItem>> {
  const qs = listSearchesQueryString(query);
  return fetchJson<Paginated<SavedSearchListItem>>(qs ? `/searches?${qs}` : "/searches");
}

export async function searchesCreate(body: CreateSearchBody): Promise<SavedSearchListItem> {
  return fetchJson<SavedSearchListItem>("/searches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function searchesGet(id: string): Promise<SavedSearchDetail> {
  return fetchJson<SavedSearchDetail>(`/searches/${id}`);
}

export async function searchesUpdate(id: string, body: UpdateSearchBody): Promise<unknown> {
  return fetchJson<unknown>(`/searches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function searchesDelete(id: string): Promise<unknown> {
  return fetchJson<unknown>(`/searches/${id}`, { method: "DELETE" });
}

export async function searchesListLeads(
  id: string,
  query: ListSearchLeadsParams = {},
): Promise<Paginated<LeadListItem>> {
  const qs = listSearchLeadsQueryString(query);
  const path = qs ? `/searches/${id}/leads?${qs}` : `/searches/${id}/leads`;
  return fetchJson<Paginated<LeadListItem>>(path);
}

export async function searchesGetCachedPage(
  id: string,
  pageIndex: number,
): Promise<SearchCachedPageResponse> {
  return fetchJson<SearchCachedPageResponse>(`/searches/${id}/cache/${pageIndex}`);
}

export async function searchesRun(id: string, resume: boolean): Promise<{ runId: string }> {
  return fetchJson<{ runId: string }>(`/searches/${id}/run`, {
    method: "POST",
    body: JSON.stringify({ resume }),
  });
}

export type SearchRunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type SearchRunItem = {
  id: string;
  searchId: string;
  status: SearchRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  jobId: string | null;
  createdAt: string;
};

export async function searchesGetStatus(
  id: string,
): Promise<{ latestRun: SearchRunItem | null }> {
  return fetchJson<{ latestRun: SearchRunItem | null }>(`/searches/${id}/status`);
}

export type ListSearchRunsParams = {
  page?: number;
  pageSize?: number;
};

function listSearchRunsQueryString(query: ListSearchRunsParams): string {
  const p = new URLSearchParams();
  if (query.page !== undefined) p.set("page", String(query.page));
  if (query.pageSize !== undefined) p.set("pageSize", String(query.pageSize));
  return p.toString();
}

export async function searchesListRuns(
  id: string,
  query: ListSearchRunsParams = {},
): Promise<Paginated<SearchRunItem>> {
  const qs = listSearchRunsQueryString(query);
  const path = qs ? `/searches/${id}/runs?${qs}` : `/searches/${id}/runs`;
  return fetchJson<Paginated<SearchRunItem>>(path);
}

export async function leadsListGlobal(query?: {
  cursor?: string;
  limit?: number;
}): Promise<LeadsGlobalListResponse> {
  const p = new URLSearchParams();
  if (query?.cursor) p.set("cursor", query.cursor);
  if (query?.limit !== undefined) p.set("limit", String(query.limit));
  const qs = p.toString();
  return fetchJson<LeadsGlobalListResponse>(qs ? `/leads?${qs}` : "/leads");
}

export async function leadsGet(id: string): Promise<LeadDetailResponse> {
  return fetchJson<LeadDetailResponse>(`/leads/${id}`);
}
