import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SavedSearch } from "@prisma/client";

export type ScrapedLeadStub = { url: string; title: string | null };

export type ScrapePageResult = {
  rawPayload: Record<string, unknown>;
  leads: ScrapedLeadStub[];
};

const MIN_FETCH_GAP_MS = 500;

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly lastFetchByHost = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  private scraperMode(): "fixture" | "http" {
    return this.config.get<"fixture" | "http">("SCRAPER_MODE") ?? "fixture";
  }

  async scrapeSearchPage(
    search: Pick<SavedSearch, "id" | "keyword" | "location" | "source">,
    pageIndex: number,
  ): Promise<ScrapePageResult> {
    if (this.scraperMode() === "fixture") {
      return this.fixturePage(search, pageIndex);
    }
    return this.httpFixtureFallback(search, pageIndex);
  }

  private fixturePage(
    search: Pick<SavedSearch, "id" | "keyword" | "location" | "source">,
    pageIndex: number,
  ): ScrapePageResult {
    const baseUrl = `https://example.com/${search.keyword.replace(/\s+/g, "-").toLowerCase()}`;
    const leads: ScrapedLeadStub[] = Array.from({ length: 3 }, (_, i) => ({
      url: `${baseUrl}/lead-${pageIndex}-${i}`,
      title: `${search.keyword} — ${search.location} (page ${pageIndex + 1}, #${i + 1})`,
    }));
    const rawPayload: Record<string, unknown> = {
      mode: "fixture",
      searchId: search.id,
      pageIndex,
      keyword: search.keyword,
      location: search.location,
      source: search.source,
      fetchedAt: new Date().toISOString(),
      results: leads.map((l) => ({ url: l.url, title: l.title })),
    };
    return { rawPayload, leads };
  }

  private async httpFixtureFallback(
    search: Pick<SavedSearch, "id" | "keyword" | "location" | "source">,
    pageIndex: number,
  ): Promise<ScrapePageResult> {
    this.logger.warn("SCRAPER_MODE=http uses fixture data until outbound scraping is configured");
    return this.fixturePage(search, pageIndex);
  }

  async fetchAllowedUrl(url: string): Promise<{ html: string; finalUrl: string }> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Unsupported URL scheme");
    }
    const host = parsed.hostname.toLowerCase();
    const allowed = new Set(["example.com", "www.example.com"]);
    if (!allowed.has(host)) {
      throw new Error(`Host not allowed by scraper policy: ${host}`);
    }
    const now = Date.now();
    const last = this.lastFetchByHost.get(host) ?? 0;
    if (now - last < MIN_FETCH_GAP_MS) {
      await new Promise((r) => setTimeout(r, MIN_FETCH_GAP_MS - (now - last)));
    }
    this.lastFetchByHost.set(host, Date.now());
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "FixlyticsScraper/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status}`);
    }
    const html = await res.text();
    return { html, finalUrl: res.url };
  }

  buildScrapedPayloadFromHtml(html: string, finalUrl: string): Record<string, unknown> {
    return {
      mode: "http",
      finalUrl,
      htmlLength: html.length,
      snippet: html.slice(0, 2000),
      fetchedAt: new Date().toISOString(),
    };
  }
}
