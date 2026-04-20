"use client";

import type { LeadDetailResponse } from "@fixlytics/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, fetchJson } from "@/lib/api-client";

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md border border-border/80 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function CheckSection({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="rounded-lg border border-border/80 bg-card px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{title}</summary>
      <div className="mt-3 space-y-2">
        <JsonBlock value={value} />
      </div>
    </details>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [lead, setLead] = useState<LeadDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchJson<LeadDetailResponse>(`/leads/${id}`);
        if (!cancelled) setLead(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load lead");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const scores = lead?.analysis?.categoryScores;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
            <Link
              href={
                lead ? `/dashboard/searches/${lead.search.id}` : "/dashboard/searches"
              }
            >
              ← Back to search
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Lead analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scores summarize the fixture-backed audit. Expand each bucket to inspect individual
            checks as structured JSON.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !lead ? (
          <p className="text-sm text-muted-foreground">Lead not found.</p>
        ) : (
          <div className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Site</CardTitle>
                <CardDescription>
                  From search{" "}
                  <span className="font-medium text-foreground">{lead.search.keyword}</span> in{" "}
                  <span className="font-medium text-foreground">{lead.search.location}</span> (
                  {lead.search.source})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">URL</div>
                  <div className="break-all font-medium text-foreground">{lead.url}</div>
                </div>
                {lead.title ? (
                  <div>
                    <div className="text-xs text-muted-foreground">Title</div>
                    <div className="text-muted-foreground">{lead.title}</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {!lead.analysis ? (
              <Alert>
                <AlertTitle>Analysis pending</AlertTitle>
                <AlertDescription>
                  The worker has not finished scoring this lead yet. Refresh after a few seconds, or
                  re-run the search pipeline from the search detail page.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
                    <div className="text-xs text-muted-foreground">SEO</div>
                    <div className="text-2xl font-semibold tabular-nums">{scores?.seo}</div>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Performance</div>
                    <div className="text-2xl font-semibold tabular-nums">{scores?.performance}</div>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Design</div>
                    <div className="text-2xl font-semibold tabular-nums">{scores?.design}</div>
                  </div>
                </div>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Raw metrics</CardTitle>
                    <CardDescription>Underlying measurements retained for reprocessing.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <JsonBlock value={lead.analysis.rawMetrics} />
                  </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Granular checks</CardTitle>
                    <CardDescription>
                      Each group mirrors the backend JSON structure (no HTML rendering).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(lead.analysis.checks).map(([key, value]) => (
                      <CheckSection key={key} title={key} value={value} />
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
