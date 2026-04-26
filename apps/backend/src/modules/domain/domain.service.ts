import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DomainService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertDomain(domain: string, rootDomain: string): Promise<{ id: string; domain: string }> {
    const now = new Date();
    return this.prisma.domain.upsert({
      where: { domain },
      create: {
        domain,
        rootDomain,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        lastSeenAt: now,
      },
      select: { id: true, domain: true },
    });
  }
}
