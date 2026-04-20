import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetail(userId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        analysis: true,
        search: {
          select: {
            id: true,
            keyword: true,
            location: true,
            source: true,
          },
        },
      },
    });
    if (!lead) {
      throw new NotFoundException("Lead not found");
    }
    return {
      id: lead.id,
      url: lead.url,
      title: lead.title,
      createdAt: lead.createdAt.toISOString(),
      search: lead.search,
      analysis: lead.analysis
        ? {
            id: lead.analysis.id,
            createdAt: lead.analysis.createdAt.toISOString(),
            rawMetrics: lead.analysis.rawMetrics,
            categoryScores: lead.analysis.categoryScores,
            checks: lead.analysis.checks,
          }
        : null,
    };
  }
}
