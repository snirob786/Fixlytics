import { SearchSource } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

/** Sync explore search (ephemeral — nothing persisted). */
export class ExploreSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keyword!: string;

  @IsEnum(SearchSource)
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
