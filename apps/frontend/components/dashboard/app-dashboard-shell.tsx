"use client";

import { LayoutDashboard, LogOut, Menu, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/searches", label: "Searches", icon: Search },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
] as const;

function titleFromPath(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/dashboard/searches") return "Searches";
  if (pathname === "/dashboard/searches/new") return "Create search";
  if (pathname.startsWith("/dashboard/searches/")) return "Search";
  if (pathname === "/dashboard/leads") return "Leads";
  if (pathname.startsWith("/dashboard/leads/")) return "Lead";
  return "Fixlytics";
}

export function AppDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const pageTitle = titleFromPath(pathname);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-150 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border/60 bg-card/90 shadow-sm backdrop-blur-xl transition-transform duration-150 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border/60 px-4 lg:h-16">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-brand transition-opacity duration-150 hover:opacity-90"
          >
            Fixlytics
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <p className="truncate px-3 text-xs text-muted-foreground">Signed in</p>
          <p className="truncate px-3 pb-2 text-sm font-medium text-foreground">{user?.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            type="button"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:h-16 lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight lg:pl-0">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-3 md:flex">
              <span className="max-w-[200px] truncate text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" type="button" onClick={() => void logout()}>
                Log out
              </Button>
            </div>
          </div>
        </header>

        <div className="animate-fade-in flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
