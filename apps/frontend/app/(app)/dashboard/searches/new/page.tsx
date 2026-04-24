"use client";

import type { SearchSource } from "@fixlytics/types";
import { SEARCH_SOURCES } from "@fixlytics/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { searchesCreate } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

function validate(keyword: string, location: string): { keyword?: string; location?: string } {
  const e: { keyword?: string; location?: string } = {};
  const k = keyword.trim();
  const l = location.trim();
  if (!k) e.keyword = "Enter a keyword.";
  if (!l) e.location = "Enter a location.";
  return e;
}

export default function NewSearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<SearchSource>("GOOGLE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ keyword?: string; location?: string }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(keyword, location);
    setFieldErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await searchesCreate({
        keyword: keyword.trim(),
        location: location.trim(),
        source,
      });
      router.push(`/dashboard/searches/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create search");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 h-8 px-2" asChild>
          <Link href="/dashboard/searches">← Back to searches</Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">Create search</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define what to look for. You can run the pipeline from the search detail page after saving.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Targeting</CardTitle>
          <CardDescription>Keyword and geography drive discovery for the selected source.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-8" onSubmit={onSubmit} noValidate>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Query</h3>
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    if (fieldErrors.keyword) setFieldErrors((f) => ({ ...f, keyword: undefined }));
                  }}
                  placeholder="e.g. dermatology clinic"
                  autoComplete="off"
                  error={fieldErrors.keyword}
                />
                <p className="text-xs text-muted-foreground">What prospects should match.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (fieldErrors.location) setFieldErrors((f) => ({ ...f, location: undefined }));
                  }}
                  placeholder="e.g. Michigan"
                  autoComplete="off"
                  error={fieldErrors.location}
                />
                <p className="text-xs text-muted-foreground">Region or city scope for results.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Source</h3>
              <Label htmlFor="source">Channel</Label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value as SearchSource)}
                className={cn(
                  "flex h-10 w-full rounded-lg border border-input/90 bg-background/80 px-3 py-2 text-sm shadow-sm transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                )}
              >
                {SEARCH_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Fixture-backed runs work for all sources until live scrapers are configured.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-6">
              <Button type="button" variant="secondary" asChild>
                <Link href="/dashboard/searches">Cancel</Link>
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Creating…" : "Create search"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
