import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SearchRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  keyword!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  area!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  platform!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
}
