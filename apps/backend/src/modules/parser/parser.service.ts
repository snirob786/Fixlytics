import { Injectable } from "@nestjs/common";

export type ParsedGoogleResult = {
  title: string;
  link: string;
  snippet: string;
  domain: string;
  rootDomain: string;
  position: number;
};

@Injectable()
export class ParserService {
  private normalizeHost(host: string): string {
    return host.toLowerCase().replace(/^www\./, "");
  }

  private toRootDomain(domain: string): string {
    const parts = domain.split(".").filter(Boolean);
    if (parts.length <= 2) return domain;
    return parts.slice(-2).join(".");
  }

  parseGoogle(items: Array<{ title?: string; link?: string; snippet?: string }>): ParsedGoogleResult[] {
    const dedupe = new Set<string>();
    const results: ParsedGoogleResult[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item.link || !item.title) continue;
      try {
        const url = new URL(item.link);
        const domain = this.normalizeHost(url.hostname);
        if (dedupe.has(domain)) continue;
        dedupe.add(domain);
        results.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet ?? "",
          domain,
          rootDomain: this.toRootDomain(domain),
          position: i + 1,
        });
      } catch {
        continue;
      }
    }
    return results;
  }
}
