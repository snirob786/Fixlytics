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
import { ApiError, fetchJson } from "@/lib/api-client";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, l] = await Promise.all([
        fetchJson<SavedSearchDetail>(`/searches/${id}`),
        fetchJson<Paginated<LeadListItem>>(`/searches/${id}/leads?page=1&pageSize=50`),
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
  }, [id]);

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

  async function saveEdits() {
    if (!detail) return;
    setBusy("save");
    setError(null);
    try {
      await fetchJson(`/searches/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ keyword, location, source }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update search");
    } finally {
      setBusy(null);
    }
  }

  async function runPipeline(resume: boolean) {
    setBusy(resume ? "resume" : "run");
    setError(null);
    try {
      await fetchJson(`/searches/${id}/run`, {
        method: "POST",
        body: JSON.stringify({ resume }),
      });
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
      await fetchJson(`/searches/${id}`, { method: "DELETE" });
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
              Run processes one page at a time using the fixture scraper, caches the raw payload,
              materializes leads, and enqueues analysis jobs automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              disabled={!!busy}
              onClick={() => void runPipeline(false)}
            >
              {busy === "run" ? "Starting…" : "Run from page 0"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!!busy}
              onClick={() => void runPipeline(true)}
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
                <CardTitle className="text-base">Edit parameters</CardTitle>
                <CardDescription>Changes apply to the next pipeline runs.</CardDescription>
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
                    {(["GOOGLE", "MAPS", "DIRECTORY"] as const).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="button" disabled={!!busy} onClick={() => void saveEdits()}>
                    {busy === "save" ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Leads</CardTitle>
                <CardDescription>
                  Open a lead to inspect structured checks. Text is rendered as plain data (no HTML
                  injection from crawled content).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!leads?.items.length ? (
                  <p className="text-sm text-muted-foreground">
                    No leads yet. Run the pipeline to materialize fixture results.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border/80">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">URL</th>
                          <th className="px-3 py-2 font-medium">Title</th>
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
