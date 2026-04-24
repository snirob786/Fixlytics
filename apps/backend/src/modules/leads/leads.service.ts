import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  toLeadDetailResponse,
  toLeadGlobalListItem,
  type LeadDetailResponseDto,
  type LeadGlobalListItemDto,
} from "./mappers/lead.mapper";
import { normalizeGlobalLeadsQuery, type ListGlobalLeadsQuery } from "./dto/list-global-leads.query";

type CursorPayload = { id: string; createdAt: string };

function encodeLeadCursor(id: string, createdAt: Date): string {
  const payload: CursorPayload = { id, createdAt: createdAt.toISOString() };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeLeadCursor(raw: string): CursorPayload {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const o = JSON.parse(json) as unknown;
    if (!o || typeof o !== "object") throw new Error("invalid");
    const id = (o as CursorPayload).id;
    const createdAt = (o as CursorPayload).createdAt;
    if (typeof id !== "string" || typeof createdAt !== "string") throw new Error("invalid");
    return { id, createdAt };
  } catch {
    throw new BadRequestException("Invalid cursor");
  }
}

export type LeadsGlobalListResponseDto = {
  items: LeadGlobalListItemDto[];
  hasNext: boolean;
  nextCursor: string | null;
};

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async listGlobal(userId: string, query: ListGlobalLeadsQuery): Promise<LeadsGlobalListResponseDto> {
    const { limit } = normalizeGlobalLeadsQuery(query);
    const take = limit + 1;

    const cursorRaw = query.cursor?.trim();
    let rows;
    if (cursorRaw) {
      const c = decodeLeadCursor(cursorRaw);
      const cDate = new Date(c.createdAt);
      if (Number.isNaN(cDate.getTime())) {
        throw new BadRequestException("Invalid cursor");
      }
      rows = await this.prisma.lead.findMany({
        where: {
          userId,
          OR: [{ createdAt: { lt: cDate } }, { AND: [{ createdAt: cDate }, { id: { lt: c.id } }] }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      });
    } else {
      rows = await this.prisma.lead.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      });
    }

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasNext && last ? encodeLeadCursor(last.id, last.createdAt) : null;

    return {
      items: page.map((l) => toLeadGlobalListItem(l)),
      hasNext,
      nextCursor,
    };
  }

  async getDetail(userId: string, leadId: string): Promise<LeadDetailResponseDto> {
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
    return toLeadDetailResponse(lead);
  }
}
