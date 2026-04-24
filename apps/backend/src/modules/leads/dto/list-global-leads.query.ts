import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class ListGlobalLeadsQuery {
  /** Opaque cursor from the previous page's `nextCursor`. */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}

export function normalizeGlobalLeadsQuery(query: ListGlobalLeadsQuery): { limit: number } {
  const raw = query.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, raw));
  return { limit };
}

export { DEFAULT_LIMIT as GLOBAL_LEADS_DEFAULT_LIMIT, MAX_LIMIT as GLOBAL_LEADS_MAX_LIMIT };
