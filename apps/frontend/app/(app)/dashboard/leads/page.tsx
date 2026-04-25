"use client";

import type { LeadListItem, Paginated, SavedSearchListItem } from "@fixlytics/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api-client";
import {
  leadsListGlobal,
  searchesList,
  searchesListLeads,
  type LeadGlobalListItem,
} from "@/lib/backend-api";
import { formatRelativeShort } from "@/lib/format-date";
import { hostnameFromUrl, isUnderperformingAvg } from "@/lib/lead-score";

const PAGE_SIZE = 25;

export default function GlobalLeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searches, setSearches] = useState<SavedSearchListItem[]>([]);
  const searchId = useMemo(() => searchParams.get("searchId") ?? "all", [searchParams]);
  const underperformingOnly = useMemo(
    () => searchParams.get("underperformingOnly") === "true",
    [searchParams],
  );
  const page = useMemo(() => {
    const raw = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  }, [searchParams]);

  const [globalItems, setGlobalItems] = useState<LeadGlobalListItem[]>([]);
  const [globalCursor, setGlobalCursor] = useState<string | null>(null);
  const [globalHasNext, setGlobalHasNext] = useState(false);

  const [pageData, setPageData] = useState<Paginated<LeadListItem> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setQueryState = useCallback(
    (updates: { searchId?: string; underperformingOnly?: boolean; page?: number }) => {
      const p = new URLSearchParams(searchParams.toString());
      const nextSearchId = updates.searchId ?? searchId;
      const nextUnderperforming = updates.underperformingOnly ?? underperformingOnly;
      const nextPage = updates.page ?? page;

      if (nextSearchId === "all") p.delete("searchId");
      else p.set("searchId", nextSearchId);

      if (nextUnderperforming) p.set("underperformingOnly", "true");
      else p.delete("underperformingOnly");

      if (nextPage <= 1) p.delete("page");
      else p.set("page", String(nextPage));

      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [page, pathname, router, searchId, searchParams, underperformingOnly],
  );

  const searchLabel = useMemo(() => {
    if (searchId === "all") return null;
    const s = searches.find((x) => x.id === searchId);
    return s ? `${s.keyword} · ${s.location}` : null;
  }, [searchId, searches]);

  const loadSearches = useCallback(async () => {
    const res = await searchesList({ page: 1, pageSize: 100 });
    setSearches(res.items);
  }, []);

  const loadGlobal = useCallback(
    async (cursor: string | null, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await leadsListGlobal({
          cursor: cursor ?? undefined,
          limit: PAGE_SIZE,
        });
        setGlobalItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setGlobalHasNext(res.hasNext);
        setGlobalCursor(res.nextCursor);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load leads");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadSearchLeads = useCallback(async () => {
    if (searchId === "all") return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchesListLeads(searchId, {
        page,
        pageSize: PAGE_SIZE,
        underperformingOnly,
      });
      setPageData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [searchId, page, underperformingOnly]);

  useEffect(() => {
    void loadSearches().catch(() => {});
  }, [loadSearches]);

  useEffect(() => {
    if (searchId === "all") {
      setPageData(null);
      void loadGlobal(null, false);
    } else {
      setGlobalItems([]);
      setGlobalCursor(null);
      setGlobalHasNext(false);
    }
  }, [searchId, loadGlobal]);

  useEffect(() => {
    if (searchId !== "all") {
      void loadSearchLeads();
    }
  }, [searchId, page, underperformingOnly, loadSearchLeads]);

  const totalPages =
    pageData && pageData.total > 0 ? Math.max(1, Math.ceil(pageData.total / pageData.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Browse leads across your workspace, or focus on a single saved search with filters and
          pagination.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Underperforming filter uses the search lead list API and is available when a search is
            selected.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="search-filter">Search</Label>
            <select
              id="search-filter"
              value={searchId}
              onChange={(e) => {
                setQueryState({ searchId: e.target.value, page: 1, underperformingOnly: false });
              }}
              className="flex h-10 w-full rounded-lg border border-input/90 bg-background/80 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              <option value="all">All leads (recent)</option>
              {searches.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.keyword} · {s.location}
                </option>
              ))}
            </select>
          </div>
          <label
            className={`flex cursor-pointer items-center gap-2 text-sm ${
              searchId === "all" ? "text-muted-foreground/60" : "text-muted-foreground"
            }`}
          >
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              checked={underperformingOnly}
              disabled={searchId === "all"}
              onChange={(e) => {
                setQueryState({ underperformingOnly: e.target.checked, page: 1 });
              }}
            />
            Underperforming only
          </label>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {searchId === "all" ? (
        <>
          {loading && !globalItems.length ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !globalItems.length ? (
            <EmptyState title="No leads yet" description="Run a search pipeline to materialize leads." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Search</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[90px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalItems.map((l) => {
                    const s = searches.find((x) => x.id === l.searchId);
                    const searchLine = s ? `${s.keyword} · ${s.location}` : l.searchId;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-foreground">
                          {l.title?.trim() || hostnameFromUrl(l.url)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{searchLine}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatRelativeShort(l.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/leads/${l.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {globalHasNext ? (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => globalCursor && void loadGlobal(globalCursor, true)}
                  >
                    {loading ? "Loading…" : "Load more"}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          {searchLabel ? (
            <p className="text-sm text-muted-foreground">
              Showing leads for <span className="font-medium text-foreground">{searchLabel}</span>
            </p>
          ) : null}
          {loading && !pageData ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !pageData?.items.length ? (
            <EmptyState
              title="No leads match"
              description={
                underperformingOnly
                  ? "Try clearing the underperforming filter or run analysis for more leads."
                  : "Run this search to collect leads."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[90px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.items.map((l) => {
                    const name = l.title?.trim() || hostnameFromUrl(l.url);
                    const under =
                      l.underperforming === true || isUnderperformingAvg(l.avgScore ?? null);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium text-foreground">{name}</TableCell>
                        <TableCell>
                          <span className="line-clamp-1 text-muted-foreground">{l.url}</span>
                        </TableCell>
                        <TableCell>
                          {under ? (
                            <Badge variant="warning">Underperforming</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/leads/${l.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {pageData.total > PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page <span className="font-medium text-foreground">{pageData.page}</span> of{" "}
                    <span className="font-medium text-foreground">{totalPages}</span>
                    <span className="mx-1">·</span>
                    {pageData.total} leads
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setQueryState({ page: Math.max(1, page - 1) })}
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loading}
                      onClick={() => setQueryState({ page: page + 1 })}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
