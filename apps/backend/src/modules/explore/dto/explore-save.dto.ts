import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { ExploreQueryMetaDto } from "./explore-query-meta.dto";

export class ExploreCategoryScoresDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  seo!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  performance!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  design!: number;
}

export class ExploreSaveSelectedItemDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @ValidateNested()
  @Type(() => ExploreCategoryScoresDto)
  scores!: ExploreCategoryScoresDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  avgScore!: number;
}

/** Persist selected workspace rows into SavedSearch + Lead + Analysis. */
export class ExploreSaveDto {
  @ValidateNested()
  @Type(() => ExploreQueryMetaDto)
  queryMeta!: ExploreQueryMetaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExploreSaveSelectedItemDto)
  selectedItems!: ExploreSaveSelectedItemDto[];
}
