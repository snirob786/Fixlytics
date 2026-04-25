"use client";

import { ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { exploreSave } from "@/lib/backend-api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setThreshold, toggleMark, toggleRemove } from "@/store/slices/exploreSlice";

export default function ResultsPage() {
  const dispatch = useAppDispatch();
  const { queryMeta, results, threshold, markedItems, removedItems, loading } = useAppSelector(
    (s) => s.explore,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const visibleRows = useMemo(
    () => results.filter((r) => !removedItems[r.id]),
    [results, removedItems],
  );

  const selectedForSave = useMemo(
    () => results.filter((r) => !removedItems[r.id] && markedItems[r.id] === true),
    [results, removedItems, markedItems],
  );

  const handleSave = useCallback(async () => {
    if (!queryMeta) return;
    setSaveError(null);
    setSaveOk(null);
    setSaveBusy(true);
    try {
      const res = await exploreSave({
        queryMeta,
        selectedItems: selectedForSave.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          scores: r.scores,
          avgScore: r.avgScore,
        })),
      });
      setSaveOk(`Saved ${res.savedCount} lead(s). Search id: ${res.searchId}.`);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaveBusy(false);
    }
  }, [queryMeta, selectedForSave]);

  if (!queryMeta && results.length === 0 && !loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h2 className="text-xl font-semibold">No results in workspace</h2>
        <p className="text-sm text-muted-foreground">
          Run a search from the bar above. Results live only in this session until you save — refresh clears them.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (loading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Results</h2>
          {queryMeta ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{queryMeta.keyword}</span> · {queryMeta.area} ·{" "}
              {queryMeta.platform}
              {queryMeta.tags.length ? (
                <>
                  {" "}
                  · tags: {queryMeta.tags.join(", ")}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="threshold" className="text-xs text-muted-foreground">
              Mark threshold (avg &lt; threshold)
            </Label>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => dispatch(setThreshold(Number(e.target.value) || 0))}
              className="h-9 w-24"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="gap-2"
            disabled={saveBusy || !queryMeta || selectedForSave.length === 0}
            onClick={() => void handleSave()}
          >
            {saveBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save ({selectedForSave.length})
          </Button>
        </div>
      </div>

      {saveError ? (
        <Alert variant="destructive">
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}
      {saveOk ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            {saveOk}{" "}
            <Link href="/dashboard/searches" className="font-medium text-primary underline-offset-4 hover:underline">
              View searches
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>
            Client-only: adjust marks, remove rows, then save. No refetch on navigation — state clears on refresh or
            sign out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">All items removed from view.</p>
          ) : (
            visibleRows.map((item) => {
              const open = !!expanded[item.id];
              const marked = markedItems[item.id] === true;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.title}</p>
                        {marked ? <Badge variant="warning">Marked</Badge> : <Badge variant="secondary">Unmarked</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{item.url}</p>
                      <p className="text-sm tabular-nums">
                        Avg score: <span className="font-semibold text-foreground">{item.avgScore}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => dispatch(toggleMark(item.id))}>
                        {marked ? "Unmark" : "Mark"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => dispatch(toggleRemove(item.id))}>
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => setExpanded((m) => ({ ...m, [item.id]: !open }))}
                      >
                        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        Details
                      </Button>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-3 grid gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">SEO</p>
                        <p className="font-medium tabular-nums">{item.scores.seo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                        <p className="font-medium tabular-nums">{item.scores.performance}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Design</p>
                        <p className="font-medium tabular-nums">{item.scores.design}</p>
                      </div>
                      <div className="sm:col-span-3">
                        <p className="text-xs text-muted-foreground">Platform / tags</p>
                        <p className="text-foreground">
                          {item.platform} · {item.tags.join(", ") || "—"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
