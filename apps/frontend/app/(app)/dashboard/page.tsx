"use client";

import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        <Card className="relative border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Saved searches</CardTitle>
            <CardDescription>
              Create searches, run the fixture-backed pipeline, and inspect per-lead analysis without
              leaving the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl">
              The worker caches raw pages, materializes leads, and scores them using the analyzer
              service. AI copy and outbound integrations stay off until you enable those phases.
            </p>
            <Button variant="outline" size="sm" className="w-fit" asChild>
              <Link href="/dashboard/searches">Open searches</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
