import { SearchSource } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEnum, IsString, MaxLength, MinLength } from "class-validator";

/** Echoed on search responses and required on save (workspace query context). */
export class ExploreQueryMetaDto {
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
}
