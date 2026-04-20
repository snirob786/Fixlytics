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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        <Card className="border-border/80 shadow-sm">
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
