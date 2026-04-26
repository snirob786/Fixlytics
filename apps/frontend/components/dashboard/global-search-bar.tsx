"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { runPipelineSearch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

type PlatformOption = "google" | "instagram" | "facebook" | "linkedin" | "any";

export function GlobalSearchBar() {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [area, setArea] = useState("");
  const [platform, setPlatform] = useState<PlatformOption>("google");
  const [intent, setIntent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keyword.trim() || !area.trim()) {
      setError("Keyword and area are required.");
      return;
    }
    setSearching(true);
    try {
      const res = await runPipelineSearch({
        keyword: keyword.trim(),
        area: area.trim(),
        platform,
        intent: intent.trim() || undefined,
      });
      router.push(`/search?q=${encodeURIComponent(res.hash)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setSearching(false);
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
          <div className="w-full min-w-[120px] space-y-1.5 sm:max-w-[180px]">
            <Label htmlFor="global-platform" className="text-xs text-muted-foreground">
              Platform
            </Label>
            <select
              id="global-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformOption)}
              className={cn(
                "flex h-9 w-full rounded-md border border-input/90 bg-background px-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              )}
            >
              <option value="google">Google</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="any">Any</option>
            </select>
          </div>
          <div className="min-w-[140px] flex-1 space-y-1.5">
            <Label htmlFor="global-intent" className="text-xs text-muted-foreground">
              Intent (optional)
            </Label>
            <Input
              id="global-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. emergency service"
              className="h-9"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:w-auto lg:shrink-0">
          {error ? <p className="text-xs text-destructive">{error}</p> : <p className="hidden text-xs text-muted-foreground lg:block">Google + cache pipeline</p>}
          <Button type="submit" size="sm" className="gap-2 lg:self-end" disabled={searching}>
            <Search className="size-4" />
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
      </form>
    </div>
  );
}
