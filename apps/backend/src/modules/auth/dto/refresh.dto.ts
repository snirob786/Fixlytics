import { IsOptional, IsString, MinLength } from "class-validator";

export class RefreshDto {
  /** Optional when refresh token is sent as HttpOnly cookie. */
  @IsOptional()
  @IsString()
  @MinLength(32)
  refreshToken?: string;
}
