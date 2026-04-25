"use client";

import type { SavedSearchDetail } from "@fixlytics/types";
import { ArrowLeft, Loader2, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  searchesRun,
  searchesUpdate,
} from "@/lib/backend-api";
import { formatDateTime } from "@/lib/format-date";
import { useSearchDetail } from "@/hooks/use-search-detail";
import { useSearchLeads } from "@/hooks/use-search-leads";
import { useSearchStatus, isPollingStatus } from "@/hooks/use-search-status";
import { hostnameFromUrl, isUnderperformingAvg } from "@/lib/lead-score";
import { cn } from "@/lib/utils";

export default function SearchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<SavedSearchDetail["source"]>("GOOGLE");
  const [formDirty, setFormDirty] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [underperformingOnly, setUnderperformingOnly] = useState(false);
  const detailState = useSearchDetail(id);
  const statusState = useSearchStatus(id);
  const leadsState = useSearchLeads(id, { underperformingOnly });
  const detail = detailState.detail;
  const leads = leadsState.leads;
  const latestRun = statusState.latestRun;
  const loading = detailState.loading || statusState.loading || leadsState.loading;
  const error = actionError ?? detailState.error ?? statusState.error ?? leadsState.error;

  const uiStatus = useMemo(() => runToUiStatus(latestRun), [latestRun]);

  useEffect(() => {
    if (!detail) return;
    setKeyword(detail.keyword);
    setLocation(detail.location);
    setSource(detail.source);
    setFormDirty(false);
  }, [detail]);

  const searchTitle = detail ? `${detail.keyword} · ${detail.location}` : "Search";
  const pipelineRunning = isPollingStatus(latestRun?.status);
  const hasUnsavedChanges =
    formDirty &&
    (!!detail &&
      (keyword !== detail.keyword || location !== detail.location || source !== detail.source));

  async function saveSearchParams() {
    if (!detail || !hasUnsavedChanges) return;
    setBusy("save");
    setActionError(null);
    try {
      await searchesUpdate(id, { keyword, location, source });
      await detailState.fetchDetail();
      setFormDirty(false);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not save search parameters");
    } finally {
      setBusy(null);
    }
  }

  async function runSearch() {
    if (!detail) return;
    setBusy("run");
    setActionError(null);
    try {
      await searchesRun(id, false);
      await statusState.fetchStatus();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not start search run";
      setActionError(msg);
      setBusy(null);
      return;
    }
    await Promise.all([statusState.fetchStatus(), leadsState.fetchLeads(), detailState.fetchDetail()]);
    setBusy(null);
  }

  async function runPipelineResume() {
    setBusy("resume");
    setActionError(null);
    try {
      await searchesRun(id, true);
      await Promise.all([statusState.fetchStatus(), leadsState.fetchLeads(), detailState.fetchDetail()]);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not enqueue job");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSearch() {
    if (!detail) return;
    const ok = window.confirm("Delete this search and its cached pages, leads, and analyses?");
    if (!ok) return;
    setBusy("delete");
    setActionError(null);
    try {
      await searchesDelete(id);
      router.push("/dashboard/searches");
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not delete search");
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
            disabled={!!busy || !hasUnsavedChanges}
            onClick={() => void saveSearchParams()}
          >
            {busy === "save" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
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
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setFormDirty(true);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setFormDirty(true);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="source">Source</Label>
                <select
                  id="source"
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value as SavedSearchDetail["source"]);
                    setFormDirty(true);
                  }}
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
              {hasUnsavedChanges ? (
                <p className="text-xs text-muted-foreground">
                  You have unsaved parameter changes.
                </p>
              ) : null}
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
