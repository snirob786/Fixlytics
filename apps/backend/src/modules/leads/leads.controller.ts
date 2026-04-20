import { Controller, Get, Param } from "@nestjs/common";
import { CurrentUser, type JwtPayloadUser } from "../../common/decorators/current-user.decorator";
import { LeadsService } from "./leads.service";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get(":id")
  getOne(@CurrentUser() user: JwtPayloadUser, @Param("id") id: string) {
    return this.leads.getDetail(user.userId, id);
  }
}
