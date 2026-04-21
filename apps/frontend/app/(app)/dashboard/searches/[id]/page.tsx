"use client";

import type { LeadListItem, Paginated, SavedSearchDetail } from "@fixlytics/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import {
  searchesDelete,
  searchesGet,
  searchesListLeads,
  searchesRun,
  searchesUpdate,
} from "@/lib/backend-api";
import { cn } from "@/lib/utils";

export default function SearchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [detail, setDetail] = useState<SavedSearchDetail | null>(null);
  const [leads, setLeads] = useState<Paginated<LeadListItem> | null>(null);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<SavedSearchDetail["source"]>("GOOGLE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [underperformingOnly, setUnderperformingOnly] = useState(false);

  const load = useCallback(
    async (opts?: { preserveError?: boolean }) => {
      setLoading(true);
      if (!opts?.preserveError) setError(null);
      try {
        const [d, l] = await Promise.all([
          searchesGet(id),
          searchesListLeads(id, {
            page: 1,
            pageSize: 50,
            underperformingOnly,
          }),
        ]);
        setDetail(d);
        setKeyword(d.keyword);
        setLocation(d.location);
        setSource(d.source);
        setLeads(l);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load search");
      } finally {
        setLoading(false);
      }
    },
    [id, underperformingOnly],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const meta = useMemo(() => {
    if (!detail) return null;
    return (
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Cached pages</div>
          <div className="text-lg font-semibold tabular-nums">{detail.cachedPages}</div>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Leads</div>
          <div className="text-lg font-semibold tabular-nums">{detail.leadCount}</div>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">Next page index</div>
          <div className="text-lg font-semibold tabular-nums">
            {detail.cursorPage === null || detail.cursorPage === undefined
              ? "0"
              : String(detail.cursorPage)}
          </div>
        </div>
      </div>
    );
  }, [detail]);

  async function runSearch() {
    if (!detail) return;
    setBusy("search");
    setError(null);
    try {
      await searchesUpdate(id, { keyword, location, source });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save search parameters");
      setBusy(null);
      return;
    }
    try {
      await searchesRun(id, false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not start search run";
      await load({ preserveError: true });
      setError(
        `${msg} Parameters were saved. If the job queue is disabled, set USE_JOB_QUEUE=true and REDIS_URL, then try Search again.`,
      );
      setBusy(null);
      return;
    }
    await load();
    setBusy(null);
  }

  async function runPipelineResume() {
    setBusy("resume");
    setError(null);
    try {
      await searchesRun(id, true);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not enqueue job");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSearch() {
    if (!detail) return;
    const ok = window.confirm("Delete this search and its cached pages, leads, and analyses?");
    if (!ok) return;
    setBusy("delete");
    setError(null);
    try {
      await searchesDelete(id);
      router.push("/dashboard/searches");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete search");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
              <Link href="/dashboard/searches">← All searches</Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Use Search to save parameters and run discovery from page 0 for the selected source.
              The worker uses the configured scraper (fixture by default), caches payloads, creates
              leads, and scores them. Connect live Google or Maps in the scraper when you are ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void runPipelineResume()}
            >
              {busy === "resume" ? "Resuming…" : "Resume from cursor"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!!busy}
              onClick={() => void deleteSearch()}
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">Search not found.</p>
        ) : (
          <div className="space-y-6">
            {meta}

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Search parameters</CardTitle>
                <CardDescription>
                  Choose where this search targets (Google, Maps, or directory). Search saves these
                  fields and starts a new run from page index 0.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="keyword">Keyword</Label>
                    <Input
                      id="keyword"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="source">Source</Label>
                  <select
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value as SavedSearchDetail["source"])}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <option value="GOOGLE">Google</option>
                    <option value="MAPS">Maps</option>
                    <option value="DIRECTORY">Directory</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="button" disabled={!!busy} onClick={() => void runSearch()}>
                    {busy === "search" ? "Searching…" : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Results</CardTitle>
                  <CardDescription>
                    After analysis completes, filter to sites whose average category score is below
                    the backend threshold (underperforming prospects).
                  </CardDescription>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={underperformingOnly}
                    onChange={(e) => setUnderperformingOnly(e.target.checked)}
                  />
                  Underperforming only
                </label>
              </CardHeader>
              <CardContent>
                {!leads?.items.length ? (
                  <p className="text-sm text-muted-foreground">
                    {underperformingOnly
                      ? "No underperforming analyzed leads match this filter yet."
                      : "No leads yet. Click Search to run discovery (requires job queue when enabled)."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border/80">
                    <table className="w-full min-w-[800px] text-left text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">URL</th>
                          <th className="px-3 py-2 font-medium">Title</th>
                          <th className="px-3 py-2 font-medium">Avg score</th>
                          <th className="px-3 py-2 font-medium">Analysis</th>
                          <th className="px-3 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/80">
                        {leads.items.map((l) => (
                          <tr key={l.id} className="bg-card">
                            <td className="px-3 py-2">
                              <span className="line-clamp-2 break-all text-muted-foreground">
                                {l.url}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {l.title ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground tabular-nums">
                              {l.avgScore != null ? (
                                <span
                                  className={
                                    l.avgScore < 58
                                      ? "font-medium text-amber-700 dark:text-amber-400"
                                      : ""
                                  }
                                >
                                  {l.avgScore.toFixed(1)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {l.analysisId ? "Ready" : "Pending"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/leads/${l.id}`}>View</Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
