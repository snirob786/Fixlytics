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
  recent?: boolean;
  underperformingOnly?: boolean;
};

function listSearchesQueryString(query: ListSearchesParams): string {
  const p = new URLSearchParams();
  if (query.page !== undefined) p.set("page", String(query.page));
  if (query.pageSize !== undefined) p.set("pageSize", String(query.pageSize));
  if (query.recent !== undefined) p.set("recent", String(query.recent));
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

export type SearchCachedPageResponse = {
  pageIndex: number;
  rawPayload: unknown;
};

export async function searchesList(
  query: ListSearchesParams = {},
): Promise<Paginated<SavedSearchListItem>> {
  const qs = listSearchesQueryString(query);
  return fetchJson<Paginated<SavedSearchListItem>>(qs ? `/searches?${qs}` : "/searches");
}

export async function searchesCreate(body: CreateSearchBody): Promise<{ id: string }> {
  return fetchJson<{ id: string }>("/searches", {
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
  query: ListSearchesParams = {},
): Promise<Paginated<LeadListItem>> {
  const qs = listSearchesQueryString(query);
  const path = qs ? `/searches/${id}/leads?${qs}` : `/searches/${id}/leads`;
  return fetchJson<Paginated<LeadListItem>>(path);
}

export async function searchesGetCachedPage(
  id: string,
  pageIndex: number,
): Promise<SearchCachedPageResponse> {
  return fetchJson<SearchCachedPageResponse>(`/searches/${id}/cache/${pageIndex}`);
}

export async function searchesRun(id: string, resume: boolean): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>(`/searches/${id}/run`, {
    method: "POST",
    body: JSON.stringify({ resume }),
  });
}

export async function leadsGet(id: string): Promise<LeadDetailResponse> {
  return fetchJson<LeadDetailResponse>(`/leads/${id}`);
}
