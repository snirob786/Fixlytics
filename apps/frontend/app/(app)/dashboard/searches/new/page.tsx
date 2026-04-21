"use client";

import type { SearchSource } from "@fixlytics/types";
import { SEARCH_SOURCES } from "@fixlytics/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { searchesCreate } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

export default function NewSearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<SearchSource>("GOOGLE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await searchesCreate({ keyword, location, source });
      router.push(`/dashboard/searches/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create search");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
            <Link href="/dashboard/searches">← Back to searches</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">New saved search</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These fields mirror how you will steer discovery once outbound scraping is wired up.
            Today they still drive the fixture-backed pipeline end to end.
          </p>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Search parameters</CardTitle>
            <CardDescription>All fields are required.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Could not save</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. dermatology clinic"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Michigan"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <select
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as SearchSource)}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {SEARCH_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/searches">Cancel</Link>
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Save search"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
