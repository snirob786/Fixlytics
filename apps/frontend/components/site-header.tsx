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
        "border-b border-border/80 bg-card/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground hover:opacity-90"
        >
          Fixlytics
        </Link>
        <div className="flex items-center gap-3 text-sm">{right}</div>
      </div>
    </header>
  );
}
