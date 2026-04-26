import type { SearchSource } from "@prisma/client";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const SEARCH_SOURCE_VALUES = ["GOOGLE", "MAPS", "DIRECTORY"] as const;

export class CreateSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keyword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  location!: string;

  @IsIn(SEARCH_SOURCE_VALUES)
  source!: SearchSource;
}
