"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { ready, hydrated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && hydrated && !user) {
      router.replace("/login");
    }
  }, [ready, hydrated, user, router]);

  if (!ready || !hydrated) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="border-b border-border/60 bg-background/70 shadow-sm backdrop-blur-xl">
          <div className="mx-auto h-14 max-w-5xl px-4" />
        </div>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
          <div className="relative">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary shadow-md shadow-primary/20" />
            <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 blur-xl" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
          <Button asChild>
            <Link href="/login">Go to login</Link>
          </Button>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
