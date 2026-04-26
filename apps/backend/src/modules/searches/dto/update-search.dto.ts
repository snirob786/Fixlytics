import type { SearchSource } from "@prisma/client";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const SEARCH_SOURCE_VALUES = ["GOOGLE", "MAPS", "DIRECTORY"] as const;

export class UpdateSearchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsIn(SEARCH_SOURCE_VALUES)
  source?: SearchSource;
}
