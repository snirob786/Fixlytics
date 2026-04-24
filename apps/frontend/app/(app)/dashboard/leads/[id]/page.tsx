"use client";

import type { LeadDetailResponse } from "@fixlytics/types";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { leadsGet } from "@/lib/backend-api";
import { formatDateTime } from "@/lib/format-date";
import { isUnderperformingAvg } from "@/lib/lead-score";

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-xl border border-border/60 bg-muted/25 p-4 text-xs leading-relaxed text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function CheckSection({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition-colors duration-150 open:bg-muted/15">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{title}</summary>
      <div className="mt-3">
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
        const res = await leadsGet(id);
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
  const avgScore = useMemo(() => {
    if (!scores) return null;
    return (scores.seo + scores.performance + scores.design) / 3;
  }, [scores]);
  const under = scores ? isUnderperformingAvg(avgScore) : false;

  const displayName = lead?.title?.trim() || lead?.url || "Lead";

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground" asChild>
          <Link href={lead ? `/dashboard/searches/${lead.search.id}` : "/dashboard/searches"}>
            <span className="flex items-center gap-1">
              <ArrowLeft className="size-4" />
              Back to search
            </span>
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{displayName}</h2>
          {scores ? (
            under ? (
              <Badge variant="warning">Underperforming</Badge>
            ) : (
              <Badge variant="success">Healthy</Badge>
            )
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !lead ? (
        <p className="text-sm text-muted-foreground">Lead not found.</p>
      ) : (
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
              <CardDescription>Primary site and how it was discovered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  URL
                </div>
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 break-all font-medium text-primary hover:underline"
                >
                  {lead.url}
                  <ExternalLink className="size-3.5 shrink-0 opacity-70" />
                </a>
              </div>
              {lead.title ? (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Page title
                  </div>
                  <p className="mt-1 text-foreground">{lead.title}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
              <CardDescription>Source search and capture time.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Saved search
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {lead.search.keyword} · {lead.search.location}{" "}
                    <span className="text-muted-foreground">({lead.search.source})</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lead created
                  </dt>
                  <dd className="mt-1 text-foreground">{formatDateTime(lead.createdAt)}</dd>
                </div>
              </dl>
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
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Performance</CardTitle>
                  <CardDescription>Category scores from the analyzer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                      <div className="text-xs text-muted-foreground">SEO</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{scores?.seo}</div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                      <div className="text-xs text-muted-foreground">Performance</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">
                        {scores?.performance}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                      <div className="text-xs text-muted-foreground">Design</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{scores?.design}</div>
                    </div>
                  </div>
                  {avgScore != null ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Average score:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {avgScore.toFixed(1)}
                      </span>
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Raw metrics</CardTitle>
                  <CardDescription>Underlying measurements retained for reprocessing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <JsonBlock value={lead.analysis.rawMetrics} />
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-sm">
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
    </div>
  );
}
