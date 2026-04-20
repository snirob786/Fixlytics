import { SearchSource } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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
  @IsEnum(SearchSource)
  source?: SearchSource;
}
