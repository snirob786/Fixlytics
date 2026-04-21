"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

export function AppHeader({ className }: { className?: string }) {
  const { logout } = useAuth();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-background/70 shadow-sm shadow-black/[0.03] backdrop-blur-xl dark:bg-background/55 dark:shadow-black/20",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="text-sm font-bold tracking-tight text-brand transition-opacity hover:opacity-90"
        >
          Fixlytics
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/searches">Searches</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
