import { ArrowRight, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        right={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </>
        }
      />
      <main className="flex flex-1 flex-col">
        <section className="border-b border-border/60 bg-linear-to-b from-muted/40 to-background px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Lead intelligence
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Find what&apos;s broken. Prove it with data.
            </h1>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Fixlytics discovers underperforming business sites, analyzes technical and design
              issues, and turns insights into targeted outreach—not generic scraping.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild>
                <Link href="/register">
                  Create account
                  <ArrowRight className="opacity-80" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="space-y-1 pb-3">
                <UserPlus className="size-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">Create account</CardTitle>
                <CardDescription>Secure access to searches and saved work.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/register">
                    Register
                    <ArrowRight className="opacity-70" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="space-y-1 pb-3">
                <LogIn className="size-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">Sign in</CardTitle>
                <CardDescription>Continue where you left off.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/login">
                    Login
                    <ArrowRight className="opacity-70" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="space-y-1 pb-3">
                <LayoutDashboard className="size-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">Dashboard</CardTitle>
                <CardDescription>Protected app area after authentication.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/dashboard">
                    Open
                    <ArrowRight className="opacity-70" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          Fixlytics — minimal scaffold; searches and analysis ship next.
        </footer>
      </main>
    </div>
  );
}
