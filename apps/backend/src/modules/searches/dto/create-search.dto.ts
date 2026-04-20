import { SearchSource } from "@prisma/client";
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export class CreateSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keyword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  location!: string;

  @IsEnum(SearchSource)
  source!: SearchSource;
}
