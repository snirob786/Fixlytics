import { ContactType } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type EnrichedPayload = {
  businessName: string;
  emails: string[];
  phones: string[];
  socials: Array<{ platform: string; url: string }>;
  location: string | null;
};

@Injectable()
export class EnrichmentService {
  constructor(private readonly prisma: PrismaService) {}

  private extractEmails(text: string): string[] {
    return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []));
  }

  private extractPhones(text: string): string[] {
    return Array.from(new Set(text.match(/(?:\+?\d[\d\s()-]{7,}\d)/g) ?? []));
  }

  private extractSocialLinks(html: string): Array<{ platform: string; url: string }> {
    const matches = Array.from(html.matchAll(/https?:\/\/[^\s"'<>]+/gi)).map((m) => m[0]);
    const platforms = ["facebook", "instagram", "linkedin", "x.com", "twitter", "youtube", "tiktok"];
    const out: Array<{ platform: string; url: string }> = [];
    for (const url of matches) {
      const hit = platforms.find((p) => url.toLowerCase().includes(p));
      if (hit) out.push({ platform: hit, url });
    }
    const unique = new Map<string, { platform: string; url: string }>();
    for (const item of out) unique.set(item.url, item);
    return Array.from(unique.values());
  }

  private extractTitle(html: string, fallback: string): string {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return (m?.[1]?.trim() || fallback).slice(0, 200);
  }

  async crawlDomain(domain: string): Promise<EnrichedPayload> {
    const paths = ["/", "/contact", "/about"];
    let combined = "";
    for (const path of paths) {
      const url = `https://${domain}${path}`;
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (res.ok) {
          combined += `\n${await res.text()}`;
        }
      } catch {
        continue;
      }
    }
    const plain = combined.replace(/<[^>]*>/g, " ");
    return {
      businessName: this.extractTitle(combined, domain),
      emails: this.extractEmails(plain),
      phones: this.extractPhones(plain),
      socials: this.extractSocialLinks(combined),
      location: null,
    };
  }

  async persist(domainId: string, payload: EnrichedPayload): Promise<{ businessId: string }> {
    const business = await this.prisma.business.upsert({
      where: { domainId },
      create: {
        domainId,
        name: payload.businessName,
        location: payload.location,
      },
      update: {
        name: payload.businessName,
        location: payload.location,
      },
      select: { id: true },
    });

    for (const email of payload.emails) {
      await this.prisma.contact.upsert({
        where: {
          businessId_type_value: {
            businessId: business.id,
            type: ContactType.EMAIL,
            value: email,
          },
        },
        create: { businessId: business.id, type: ContactType.EMAIL, value: email, source: "crawl" },
        update: { source: "crawl" },
      });
    }

    for (const phone of payload.phones) {
      const type = phone.includes("whatsapp") ? ContactType.WHATSAPP : ContactType.PHONE;
      await this.prisma.contact.upsert({
        where: { businessId_type_value: { businessId: business.id, type, value: phone } },
        create: { businessId: business.id, type, value: phone, source: "crawl" },
        update: { source: "crawl" },
      });
    }

    for (const social of payload.socials) {
      await this.prisma.socialProfile.upsert({
        where: { businessId_url: { businessId: business.id, url: social.url } },
        create: { businessId: business.id, platform: social.platform, url: social.url },
        update: { platform: social.platform },
      });
    }

    return { businessId: business.id };
  }
}
