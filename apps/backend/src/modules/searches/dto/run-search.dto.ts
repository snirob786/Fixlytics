import { IsBoolean } from "class-validator";

export class RunSearchDto {
  @IsBoolean()
  resume!: boolean;
}
