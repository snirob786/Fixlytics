"use client";

import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { ready, hydrated } = useAuth();

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

  return <>{children}</>;
}
