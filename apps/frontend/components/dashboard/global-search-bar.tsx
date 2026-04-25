"use client";

import { SEARCH_SOURCES, type SearchSource } from "@fixlytics/types";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { exploreSearch } from "@/lib/backend-api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  exploreSearchFailed,
  exploreSearchStarted,
  exploreSearchSucceeded,
} from "@/store/slices/exploreSlice";
import { cn } from "@/lib/utils";

export function GlobalSearchBar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searching = useAppSelector((s) => s.explore.loading);
  const [keyword, setKeyword] = useState("");
  const [area, setArea] = useState("");
  const [platform, setPlatform] = useState<SearchSource>("GOOGLE");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const addTag = useCallback(() => {
    const t = tagDraft.trim();
    if (!t || tags.includes(t) || tags.length >= 20) return;
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  }, [tagDraft, tags]);

  const removeTag = useCallback((t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keyword.trim() || !area.trim()) {
      setError("Keyword and area are required.");
      return;
    }
    dispatch(exploreSearchStarted());
    try {
      const res = await exploreSearch({
        keyword: keyword.trim(),
        platform,
        area: area.trim(),
        tags,
        limit: Math.min(50, Math.max(1, limit)),
      });
      dispatch(exploreSearchSucceeded(res));
      router.push("/results");
    } catch (err) {
      dispatch(exploreSearchFailed());
      setError(err instanceof ApiError ? err.message : "Search failed");
    }
  }

  return (
    <div className="border-b border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
      <form onSubmit={(e) => void onSubmit(e)} className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <div className="min-w-[140px] flex-1 space-y-1.5">
            <Label htmlFor="global-keyword" className="text-xs text-muted-foreground">
              Keyword
            </Label>
            <Input
              id="global-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. plumbers"
              className="h-9"
            />
          </div>
          <div className="min-w-[120px] flex-1 space-y-1.5">
            <Label htmlFor="global-area" className="text-xs text-muted-foreground">
              Area
            </Label>
            <Input
              id="global-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="City or region"
              className="h-9"
            />
          </div>
          <div className="w-full min-w-[120px] space-y-1.5 sm:max-w-[160px]">
            <Label htmlFor="global-platform" className="text-xs text-muted-foreground">
              Platform
            </Label>
            <select
              id="global-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as SearchSource)}
              className={cn(
                "flex h-9 w-full rounded-md border border-input/90 bg-background px-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              )}
            >
              {SEARCH_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[72px] space-y-1.5 sm:max-w-[88px]">
            <Label htmlFor="global-limit" className="text-xs text-muted-foreground">
              Limit
            </Label>
            <Input
              id="global-limit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 20)}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
          <Label className="text-xs text-muted-foreground">Tags</Label>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-input/60 bg-background/80 p-1.5">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => removeTag(t)}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                {t} ×
              </button>
            ))}
            <div className="flex min-w-[120px] flex-1 items-center gap-1">
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag…"
                className="h-7 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
              />
              <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={addTag}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:w-auto lg:shrink-0">
          {error ? <p className="text-xs text-destructive">{error}</p> : <p className="hidden text-xs text-muted-foreground lg:block">Ephemeral workspace</p>}
          <Button type="submit" size="sm" className="gap-2 lg:self-end" disabled={searching}>
            <Search className="size-4" />
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
      </form>
    </div>
  );
}
