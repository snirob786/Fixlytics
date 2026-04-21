"use client";

import type { Paginated, SavedSearchListItem } from "@fixlytics/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import { searchesList } from "@/lib/backend-api";

const PAGE_SIZE = 5;

export default function SearchesPage() {
  const [data, setData] = useState<Paginated<SavedSearchListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchesList({
        page,
        pageSize: PAGE_SIZE,
        recent: true,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load searches");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages =
    data && data.total > 0 ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved searches</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent saved searches from the database ({PAGE_SIZE} per page). Enable{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">USE_JOB_QUEUE=true</code> with
              Redis to run the pipeline.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/searches/new">New search</Link>
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="relative border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Recent searches</CardTitle>
            <CardDescription>
              Ordered by last update. Pagination is server-side against PostgreSQL (no Redis
              required for this list).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !data?.items.length ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">No searches yet.</p>
                <Button asChild variant="outline" className="w-fit">
                  <Link href="/dashboard/searches/new">Create your first search</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border/70 bg-muted/20 shadow-inner shadow-black/[0.04] dark:bg-muted/10 dark:shadow-black/20">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-linear-to-b from-muted/80 to-muted/40 text-xs uppercase tracking-wide text-muted-foreground dark:from-muted/50 dark:to-muted/25">
                      <tr>
                        <th className="px-3 py-2 font-medium">Keyword</th>
                        <th className="px-3 py-2 font-medium">Location</th>
                        <th className="px-3 py-2 font-medium">Source</th>
                        <th className="px-3 py-2 font-medium">Next page</th>
                        <th className="px-3 py-2 font-medium">Leads</th>
                        <th className="px-3 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/80">
                      {data.items.map((s) => (
                        <tr key={s.id} className="bg-card">
                          <td className="px-3 py-2 font-medium text-foreground">{s.keyword}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.location}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.source}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {s.cursorPage === null || s.cursorPage === undefined
                              ? "0"
                              : String(s.cursorPage)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{s.leadCount}</td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/searches/${s.id}`}>Open</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.total > PAGE_SIZE ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page <span className="font-medium text-foreground">{data.page}</span> of{" "}
                      <span className="font-medium text-foreground">{totalPages}</span>
                      <span className="mx-1">·</span>
                      {data.total} saved
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || loading}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
