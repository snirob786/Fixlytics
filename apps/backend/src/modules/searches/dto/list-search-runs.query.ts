import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { DEFAULT_LIST_PAGE_SIZE, MAX_SEARCH_LIST_PAGE_SIZE } from "../../../common/constants/pagination";

export class ListSearchRunsQuery {
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

export function normalizeSearchRunsQuery(query: ListSearchRunsQuery): { page: number; pageSize: number } {
  const page = Math.max(1, query.page ?? 1);
  const raw = query.pageSize ?? DEFAULT_LIST_PAGE_SIZE;
  const pageSize = Math.min(MAX_SEARCH_LIST_PAGE_SIZE, Math.max(1, raw));
  return { page, pageSize };
}
