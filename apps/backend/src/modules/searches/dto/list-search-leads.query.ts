import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";
import { DEFAULT_LIST_PAGE_SIZE, MAX_SEARCH_LIST_PAGE_SIZE } from "../../../common/constants/pagination";

function toBool(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (value === true || value === 1) return true;
  const s = String(value).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

/** Query for `GET /searches/:id/leads` — `underperformingOnly` is applied in service when true. */
export class ListSearchLeadsQuery {
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  underperformingOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SEARCH_LIST_PAGE_SIZE)
  pageSize?: number;
}

export function normalizeSearchLeadsQuery(query: ListSearchLeadsQuery): {
  page: number;
  pageSize: number;
  underperformingOnly: boolean;
} {
  const underperformingOnly = !!query.underperformingOnly;
  const page = Math.max(1, query.page ?? 1);
  const raw = query.pageSize ?? DEFAULT_LIST_PAGE_SIZE;
  const pageSize = Math.min(MAX_SEARCH_LIST_PAGE_SIZE, Math.max(1, raw));
  return { page, pageSize, underperformingOnly };
}
