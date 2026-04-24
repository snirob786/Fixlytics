"use client";

import type { Paginated, SavedSearchListItem } from "@fixlytics/types";
import { ChevronLeft, ChevronRight, Plus, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SearchRunStatusBadge, runToUiStatus } from "@/components/dashboard/search-run-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { searchesGetStatus, searchesList, type SearchRunItem } from "@/lib/backend-api";
import { formatRelativeShort } from "@/lib/format-date";

const PAGE_SIZE = 10;

export default function SearchesPage() {
  const [data, setData] = useState<Paginated<SavedSearchListItem> | null>(null);
  const [runById, setRunById] = useState<Record<string, SearchRunItem | null>>({});
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
      });
      setData(res);
      const statuses = await Promise.all(
        res.items.map((s) =>
          searchesGetStatus(s.id).then((r) => ({ id: s.id, latest: r.latestRun })),
        ),
      );
      const map: Record<string, SearchRunItem | null> = {};
      for (const { id, latest } of statuses) map[id] = latest;
      setRunById(map);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load searches");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(
    () => (data && data.total > 0 ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Searches</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved discovery targets and their latest pipeline status.
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href="/dashboard/searches/new" className="gap-2">
            <Plus className="size-4" />
            Create search
          </Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="mb-4 flex gap-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<SearchIcon className="size-5" />}
          title="No searches yet"
          description="Create a saved search to run the pipeline and collect scored leads."
        >
          <Button asChild>
            <Link href="/dashboard/searches/new">Create search</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((s) => {
                const latest = runById[s.id];
                const ui = runToUiStatus(latest);
                const lastAt = latest?.finishedAt ?? latest?.startedAt ?? latest?.createdAt;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{s.keyword}</div>
                      <div className="text-xs text-muted-foreground">{s.location}</div>
                    </TableCell>
                    <TableCell>
                      <SearchRunStatusBadge status={ui} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {s.leadCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatRelativeShort(lastAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/searches/${s.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {data.total > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
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
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
