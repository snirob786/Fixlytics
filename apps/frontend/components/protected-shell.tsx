"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-card/50 lg:block">
          <div className="h-16 border-b border-border/60 px-4 py-4">
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="h-14 border-b border-border/60 bg-background/80 px-4 py-3 sm:h-16 sm:px-6">
            <Skeleton className="h-8 w-48 rounded-md" />
          </header>
          <main className="flex-1 space-y-6 p-4 sm:p-6">
            <Skeleton className="h-32 w-full max-w-3xl rounded-2xl" />
            <Skeleton className="h-48 w-full max-w-3xl rounded-2xl" />
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex h-10 max-w-5xl items-center justify-between">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </header>
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
