import { Sparkles } from "lucide-react";

import { HomeFeatureCards, HomeHeaderActions, HomeHeroActions } from "@/components/home-page-auth";
import { SiteHeader } from "@/components/site-header";

/*
  TEMP DISABLED:
  Homepage is intentionally disabled as the root entry point.
  Will be restored after auth + data pipeline is complete.
*/
export default function DisabledHomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader right={<HomeHeaderActions />} />
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden border-b border-border/50 px-4 py-20 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-primary/[0.07] via-transparent to-transparent"
          />
          <div aria-hidden className="pointer-events-none absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl sm:h-96 sm:w-96" />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full bg-cyan-500/15 blur-3xl dark:bg-cyan-400/12"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-1/2 -z-10 h-64 w-[min(100%,42rem)] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/10"
          />

          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md dark:bg-card/40">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Lead intelligence
            </p>
            <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
              Find what&apos;s broken.{" "}
              <span className="text-hero-accent">Prove it with data.</span>
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Fixlytics discovers underperforming business sites, analyzes technical and design
              issues, and turns insights into targeted outreach-not generic scraping.
            </p>
            <HomeHeroActions />
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:py-20">
          <HomeFeatureCards />
        </section>

        <footer className="border-t border-border/60 bg-linear-to-t from-muted/30 to-transparent py-10 text-center text-xs text-muted-foreground">
          Fixlytics - minimal scaffold; searches and analysis ship next.
        </footer>
      </main>
    </div>
  );
}
