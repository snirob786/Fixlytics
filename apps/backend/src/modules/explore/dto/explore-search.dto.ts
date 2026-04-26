import type { SearchSource } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const SEARCH_SOURCE_VALUES = ["GOOGLE", "MAPS", "DIRECTORY"] as const;

/** Sync explore search (ephemeral — nothing persisted). */
export class ExploreSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keyword!: string;

  @IsIn(SEARCH_SOURCE_VALUES)
  platform!: SearchSource;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  area!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
