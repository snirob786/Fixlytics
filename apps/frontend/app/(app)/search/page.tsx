"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPipelineSearch, type PipelineSearchResultItem } from "@/lib/backend-api";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type PollState = "loading" | "processing" | "ready" | "failed";
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_MS = 120000;

export default function SearchPage() {
  const params = useSearchParams();
  const hash = params.get("q") ?? "";
  const [state, setState] = useState<PollState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PipelineSearchResultItem[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [selected, setSelected] = useState<PipelineSearchResultItem | null>(null);

  useEffect(() => {
    if (!hash) {
      setResults([]);
      setSelected(null);
      setState("failed");
      setError("Missing search hash.");
      return;
    }
    setState("loading");
    setError(null);
    setResults([]);
    setSelected(null);
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    const run = async () => {
      try {
        const res = await getPipelineSearch(hash);
        if (!alive) return;
        setResults(res.data);
        if (res.status === "ready") {
          setError(null);
          setState("ready");
          return;
        }
        if (res.status === "failed") {
          setState("failed");
          setError(res.error ?? "Search processing failed");
          return;
        }
        if (Date.now() - startedAt >= MAX_POLL_MS) {
          setState("failed");
          setError("Search is taking too long. Please try again.");
          return;
        }
        setState("processing");
        timer = setTimeout(() => void run(), POLL_INTERVAL_MS);
      } catch (e) {
        if (!alive) return;
        setResults([]);
        setState("failed");
        setError(e instanceof ApiError ? e.message : "Search polling failed");
      }
    };

    void run();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [hash]);

  const filtered = useMemo(
    () =>
      results.filter((r) => {
        if (r.score < minScore) return false;
        if (hasEmail && !r.contacts.some((c) => c.type === "EMAIL")) return false;
        if (hasPhone && !r.contacts.some((c) => c.type === "PHONE" || c.type === "WHATSAPP")) return false;
        return true;
      }),
    [results, minScore, hasEmail, hasPhone],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Search Results</h2>
        <p className="text-sm text-muted-foreground">Hash: {hash || "N/A"}</p>
      </div>

      {state !== "ready" && state !== "failed" ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {state === "loading" ? "Loading results..." : "Processing search and enrichment..."}
          </CardContent>
        </Card>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="min-score">Min score</Label>
              <Input
                id="min-score"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value) || 0)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} />
              Has email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasPhone} onChange={(e) => setHasPhone(e.target.checked)} />
              Has phone
            </label>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={`${item.domain}-${item.link}`}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.businessName}</p>
                    <p className="text-xs text-muted-foreground">{item.domain}</p>
                  </div>
                  <div className="min-w-[120px]">
                    <div className="mb-1 h-2 rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${item.score}%` }} />
                    </div>
                    <p className="text-right text-xs tabular-nums text-muted-foreground">{item.score}/100</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{item.snippet}</p>
                <p className="text-xs">
                  Contacts:{" "}
                  {item.contacts.length
                    ? item.contacts.map((c) => `${c.type.toLowerCase()}: ${c.value}`).join(" | ")
                    : "none"}
                </p>
                <Button variant="outline" size="sm" onClick={() => setSelected(item)}>
                  View details
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No matching results.</p> : null}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">{selected.businessName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">Domain: {selected.domain}</p>
              <p className="text-sm">Link: {selected.link}</p>
              <p className="text-sm">Score: {selected.score}</p>
              <p className="text-sm">
                Social: {selected.socialProfiles.length ? selected.socialProfiles.map((s) => s.url).join(", ") : "none"}
              </p>
              <div className="pt-2">
                <Button size="sm" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
