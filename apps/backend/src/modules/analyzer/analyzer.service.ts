import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

export type CategoryScores = {
  seo: number;
  performance: number;
  design: number;
};

export type AnalysisOutput = {
  rawMetrics: Record<string, unknown>;
  categoryScores: CategoryScores;
  checks: Record<string, unknown>;
};

function hashToUInt(str: string): number {
  const h = createHash("sha256").update(str).digest();
  return h.readUInt32BE(0);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

@Injectable()
export class AnalyzerService {
  analyze(scrapedPayload: Record<string, unknown>, leadUrl: string): AnalysisOutput {
    const seed = hashToUInt(`${leadUrl}:${JSON.stringify(scrapedPayload)}`);
    const hasTitle =
      typeof scrapedPayload.snippet === "string"
        ? /<\s*title[\s>]/i.test(scrapedPayload.snippet as string)
        : (seed & 1) === 0;
    const htmlLen =
      typeof scrapedPayload.htmlLength === "number"
        ? (scrapedPayload.htmlLength as number)
        : 800 + (seed % 4000);
    const ttfbMs = 120 + (seed % 900);

    const rawMetrics: Record<string, unknown> = {
      ttfbMs,
      approxHtmlBytes: htmlLen,
      fixture: scrapedPayload.mode === "fixture",
    };

    const seoBase = hasTitle ? 62 : 38;
    const perfBase = htmlLen > 3500 ? 48 : 72;
    const designBase = (seed >> 3) % 2 === 0 ? 55 : 66;

    const categoryScores: CategoryScores = {
      seo: clampScore(seoBase + (seed % 7) - 3),
      performance: clampScore(perfBase + ((seed >> 8) % 9) - 4),
      design: clampScore(designBase + ((seed >> 16) % 11) - 5),
    };

    const checks: Record<string, unknown> = {
      seo: {
        has_meta_title: hasTitle,
        h1_count: hasTitle ? 1 : 0,
        canonical_present: (seed >> 2) % 3 === 0,
      },
      performance: {
        ttfb_ms: ttfbMs,
        large_document: htmlLen > 3000,
      },
      design: {
        has_viewport_meta: (seed >> 5) % 2 === 0,
        inline_style_ratio_bucket: htmlLen > 2500 ? "high" : "low",
      },
    };

    return { rawMetrics, categoryScores, checks };
  }
}
