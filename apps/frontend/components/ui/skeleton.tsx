import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/70 ring-1 ring-border/40 dark:bg-muted/40",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
