import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export const MAX_SEARCH_LIST_PAGE_SIZE = 50;

export class ListSearchesQuery {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return false;
    if (value === true || value === 1) return true;
    const s = String(value).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  })
  @IsBoolean()
  recent?: boolean;

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
