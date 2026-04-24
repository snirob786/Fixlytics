import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  /** When set, shows error styling and message below the field. */
  error?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, id, ...props }, ref) => {
    const errId = error ? `${id ?? props.name ?? "input"}-error` : undefined;
    return (
      <div className="w-full">
        <input
          type={type}
          id={id}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-background/80 px-3 py-2 text-base shadow-sm transition-[box-shadow,background-color,border-color] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error
              ? "border-destructive/60 focus-visible:ring-destructive/40"
              : "border-input/90 focus-visible:border-primary/35",
            className,
          )}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          {...props}
        />
        {error ? (
          <p id={errId} className="mt-1.5 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
