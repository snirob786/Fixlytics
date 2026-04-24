"use client";

import type { LeadListItem, Paginated, SavedSearchDetail } from "@fixlytics/types";
import { ArrowLeft, Loader2, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  SearchRunStatusBadge,
  runToUiStatus,
} from "@/components/dashboard/search-run-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  searchesDelete,
  searchesGet,
  searchesGetStatus,
  searchesListLeads,
  searchesRun,
  searchesUpdate,
  type SearchRunItem,
} from "@/lib/backend-api";
import { formatDateTime } from "@/lib/format-date";
import { hostnameFromUrl, isUnderperformingAvg } from "@/lib/lead-score";
import { cn } from "@/lib/utils";

const POLL_MS = 2500;

export default function SearchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [detail, setDetail] = useState<SavedSearchDetail | null>(null);
  const [leads, setLeads] = useState<Paginated<LeadListItem> | null>(null);
  const [latestRun, setLatestRun] = useState<SearchRunItem | null>(null);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<SavedSearchDetail["source"]>("GOOGLE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [underperformingOnly, setUnderperformingOnly] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await searchesGetStatus(id);
      setLatestRun(s.latestRun);
    } catch {
      /* ignore polling errors */
    }
  }, [id]);

  const load = useCallback(
    async (opts?: { preserveError?: boolean; silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      if (!opts?.preserveError) setError(null);
      try {
        const [d, l, st] = await Promise.all([
          searchesGet(id),
          searchesListLeads(id, {
            page: 1,
            pageSize: 50,
            underperformingOnly,
          }),
          searchesGetStatus(id),
        ]);
        setDetail(d);
        setKeyword(d.keyword);
        setLocation(d.location);
        setSource(d.source);
        setLeads(l);
        setLatestRun(st.latestRun);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load search");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [id, underperformingOnly],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const uiStatus = useMemo(() => runToUiStatus(latestRun), [latestRun]);

  useEffect(() => {
    if (!latestRun || (latestRun.status !== "QUEUED" && latestRun.status !== "RUNNING")) {
      return;
    }
    const t = window.setInterval(() => {
      void refreshStatus();
      void load({ preserveError: true, silent: true });
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [latestRun, load, refreshStatus]);

  const searchTitle = detail ? `${detail.keyword} · ${detail.location}` : "Search";
  const pipelineRunning = uiStatus === "running";

  async function runSearch() {
    if (!detail) return;
    setBusy("run");
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
      await refreshStatus();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not start search run";
      await load({ preserveError: true });
      setError(
        `${msg} Parameters were saved. If the job queue is disabled, set USE_JOB_QUEUE=true and REDIS_URL, then try again.`,
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
      await refreshStatus();
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

  const lastRunAt =
    latestRun?.finishedAt ?? latestRun?.startedAt ?? latestRun?.createdAt ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
            <Link href="/dashboard/searches" className="gap-1 text-muted-foreground">
              <ArrowLeft className="size-4" />
              Searches
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{searchTitle}</h2>
            <SearchRunStatusBadge status={uiStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!busy || pipelineRunning}
            onClick={() => void runPipelineResume()}
          >
            {busy === "resume" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Resuming…
              </>
            ) : (
              "Resume"
            )}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!!busy || pipelineRunning}
            onClick={() => void runSearch()}
            className="gap-2"
          >
            {busy === "run" || pipelineRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {pipelineRunning ? "Running…" : "Starting…"}
              </>
            ) : (
              <>
                <Play className="size-4" />
                Run
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!!busy}
            onClick={() => void deleteSearch()}
            className="gap-2"
          >
            {busy === "delete" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading && !detail ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : !detail ? (
        <p className="text-sm text-muted-foreground">Search not found.</p>
      ) : (
        <>
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>High-level stats for this saved search.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Created
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {formatDateTime(detail.createdAt)}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Last run
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {formatDateTime(lastRunAt ?? undefined)}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total leads
                  </dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                    {detail.leadCount}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Parameters</CardTitle>
              <CardDescription>Edit fields before running discovery again.</CardDescription>
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
                    "flex h-10 w-full rounded-lg border border-input/90 bg-background/80 px-3 py-2 text-sm shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  )}
                >
                  <option value="GOOGLE">Google</option>
                  <option value="MAPS">Maps</option>
                  <option value="DIRECTORY">Directory</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Leads</CardTitle>
                <CardDescription>
                  Analyzed sites linked to this search. Toggle to focus on underperforming prospects.
                </CardDescription>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  checked={underperformingOnly}
                  onChange={(e) => setUnderperformingOnly(e.target.checked)}
                />
                Underperforming only
              </label>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              ) : !leads?.items.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {underperformingOnly
                    ? "No underperforming analyzed leads match this filter yet."
                    : "No leads yet. Run the pipeline to discover and score sites."}
                </p>
              ) : (
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
                    {leads.items.map((l) => {
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
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
