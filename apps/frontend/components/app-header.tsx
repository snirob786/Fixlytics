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
        "border-b border-border/80 bg-card/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-foreground hover:opacity-90"
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
