"use client";

import type { SavedSearchListItem } from "@fixlytics/types";
import { AlertTriangle, Layers, Search, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { fetchDashboardStats, type DashboardStats } from "@/lib/dashboard-stats";
import { formatRelativeShort } from "@/lib/format-date";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  className,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 shadow-sm transition-shadow duration-150 hover:shadow-md",
        className,
      )}
    >
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-20 rounded-md" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRow({ s }: { s: SavedSearchListItem }) {
  const name = `${s.keyword} · ${s.location}`;
  return (
    <Link
      href={`/dashboard/searches/${s.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3 transition-colors duration-150 hover:border-border/60 hover:bg-muted/30"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          {s.leadCount} leads · {formatRelativeShort(s.updatedAt)}
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium text-primary">View</span>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchDashboardStats();
      setStats(s);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load overview</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section>
        <h2 className="sr-only">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total searches"
            value={stats?.totalSearches ?? 0}
            icon={Search}
            loading={loading}
          />
          <StatCard
            label="Total leads"
            value={stats?.totalLeads ?? 0}
            icon={Layers}
            loading={loading}
          />
          <StatCard
            label="Underperforming leads"
            value={stats?.underperformingLeads ?? 0}
            icon={TrendingDown}
            loading={loading}
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden />
          Underperforming counts use the same score threshold as each search&apos;s filtered lead
          list.
        </p>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Recent searches</h2>
            <p className="text-sm text-muted-foreground">Last five by activity.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/searches">View all</Link>
          </Button>
        </div>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            {loading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : !stats?.recentSearches.length ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No searches yet.{" "}
                <Link href="/dashboard/searches/new" className="font-medium text-primary underline-offset-4 hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {stats.recentSearches.map((s) => (
                  <li key={s.id}>
                    <RecentRow s={s} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
