import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SiteHeader({
  className,
  right,
}: {
  className?: string;
  right?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-background/70 shadow-sm shadow-black/[0.03] backdrop-blur-xl dark:bg-background/55 dark:shadow-black/20",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-brand transition-opacity hover:opacity-90"
        >
          Fixlytics
        </Link>
        <div className="flex items-center gap-3 text-sm">{right}</div>
      </div>
    </header>
  );
}
