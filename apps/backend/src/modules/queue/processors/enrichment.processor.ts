import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ContactType } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { EnrichmentService } from "../../enrichment/enrichment.service";
import { ScoringService } from "../../scoring/scoring.service";
import {
  ENRICH_DOMAIN_JOB,
  ENRICHMENT_QUEUE,
  type EnrichmentJobData,
} from "../queue.constants";

@Processor(ENRICHMENT_QUEUE)
export class EnrichmentProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrichment: EnrichmentService,
    private readonly scoring: ScoringService,
  ) {
    super();
  }

  override async process(job: Job<EnrichmentJobData>): Promise<void> {
    if (job.name !== ENRICH_DOMAIN_JOB) return;
    const domain = await this.prisma.domain.findUnique({
      where: { id: job.data.domainId },
      select: { id: true, domain: true },
    });
    if (!domain) return;

    const payload = await this.enrichment.crawlDomain(domain.domain);
    const { businessId } = await this.enrichment.persist(domain.id, payload);

    const [contacts, socialProfiles, searchResults] = await Promise.all([
      this.prisma.contact.findMany({ where: { businessId } }),
      this.prisma.socialProfile.findMany({ where: { businessId } }),
      this.prisma.searchResult.findMany({
        where: { domainId: domain.id },
        select: { title: true, snippet: true },
      }),
    ]);

    const haystack = `${payload.businessName} ${searchResults.map((x) => `${x.title} ${x.snippet}`).join(" ")}`.toLowerCase();
    const keyword = (job.data.keyword ?? "").toLowerCase();
    const area = (job.data.area ?? "").toLowerCase();
    const score = this.scoring.scoreBusiness({
      hasEmail: contacts.some((c) => c.type === ContactType.EMAIL),
      hasPhone: contacts.some((c) => c.type === ContactType.PHONE || c.type === ContactType.WHATSAPP),
      hasLocationMatch: !!area && haystack.includes(area),
      socialCount: socialProfiles.length,
      keywordMatch: !!keyword && haystack.includes(keyword),
      geoMatch: !!area && haystack.includes(area),
    });

    await this.prisma.business.update({
      where: { id: businessId },
      data: { confidenceScore: score },
    });
  }
}
