"use client";

import { ArrowRight, LayoutDashboard, LogIn, Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HomeHeaderActions() {
  const { user, hydrated, logout } = useAuth();

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-22 animate-pulse rounded-md bg-muted/80" aria-hidden />
        <div className="h-9 w-26 animate-pulse rounded-md bg-muted/80" aria-hidden />
      </div>
    );
  }

  if (user) {
    return (
      <>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={() => void logout()}>
          Sign out
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">Get started</Link>
      </Button>
    </>
  );
}

export function HomeHeroActions() {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <div className="h-11 w-44 animate-pulse rounded-lg bg-muted/80" aria-hidden />
        <div className="h-11 w-28 animate-pulse rounded-lg bg-muted/80" aria-hidden />
      </div>
    );
  }

  if (user) {
    return (
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="rounded-lg px-6 shadow-lg shadow-primary/25" asChild>
          <Link href="/dashboard">
            Go to dashboard
            <ArrowRight className="opacity-90" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="rounded-lg px-6" asChild>
          <Link href="/dashboard/searches">Your searches</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <Button size="lg" className="rounded-lg px-6 shadow-lg shadow-primary/25" asChild>
        <Link href="/register">
          Create account
          <ArrowRight className="opacity-90" />
        </Link>
      </Button>
      <Button variant="outline" size="lg" className="rounded-lg px-6" asChild>
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}

export function HomeFeatureCards() {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <div className="grid gap-5 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Card key={key} className="border-border/70">
            <CardHeader className="space-y-2 pb-3">
              <div className="size-10 animate-pulse rounded-xl bg-muted/80" aria-hidden />
              <div className="h-5 w-32 animate-pulse rounded bg-muted/80" aria-hidden />
              <div className="h-4 w-full max-w-48 animate-pulse rounded bg-muted/60" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="h-10 w-full animate-pulse rounded-md bg-muted/80" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (user) {
    return (
      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="group border-border/70 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-cyan-500/10 ring-1 ring-primary/10">
              <LayoutDashboard className="size-5 text-primary" aria-hidden />
            </div>
            <CardTitle className="text-base">Dashboard</CardTitle>
            <CardDescription>Overview, activity, and quick entry to your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/dashboard">
                Open
                <ArrowRight className="opacity-70 transition group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="group border-border/70 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-violet-500/10 ring-1 ring-primary/10">
              <Search className="size-5 text-primary" aria-hidden />
            </div>
            <CardTitle className="text-base">Saved searches</CardTitle>
            <CardDescription>Run, resume, and manage your lead discovery jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/dashboard/searches">
                View searches
                <ArrowRight className="opacity-70 transition group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="group border-border/70 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/12 to-primary/15 ring-1 ring-primary/10">
              <Plus className="size-5 text-primary" aria-hidden />
            </div>
            <CardTitle className="text-base">New search</CardTitle>
            <CardDescription>Start a fresh keyword and location scrape.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/dashboard/searches/new">
                Create
                <ArrowRight className="opacity-70 transition group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Card className="group border-border/70 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-cyan-500/10 ring-1 ring-primary/10">
            <UserPlus className="size-5 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-base">Create account</CardTitle>
          <CardDescription>Secure access to searches and saved work.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/register">
              Register
              <ArrowRight className="opacity-70 transition group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="group border-border/70 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-violet-500/10 ring-1 ring-primary/10">
            <LogIn className="size-5 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-base">Sign in</CardTitle>
          <CardDescription>Continue where you left off.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/login">
              Login
              <ArrowRight className="opacity-70 transition group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="group border-border/70 transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500/12 to-primary/15 ring-1 ring-primary/10">
            <LayoutDashboard className="size-5 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-base">Dashboard</CardTitle>
          <CardDescription>Protected app area after authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/dashboard">
              Open
              <ArrowRight className="opacity-70 transition group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
