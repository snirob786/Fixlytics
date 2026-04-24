import { Controller, Get, Param, Query } from "@nestjs/common";
import { ParseResourceIdPipe } from "../../common/pipes/parse-resource-id.pipe";
import { CurrentUser, type JwtPayloadUser } from "../../common/decorators/current-user.decorator";
import { ListGlobalLeadsQuery } from "./dto/list-global-leads.query";
import { LeadsService } from "./leads.service";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  listGlobal(@CurrentUser() user: JwtPayloadUser, @Query() query: ListGlobalLeadsQuery) {
    return this.leads.listGlobal(user.userId, query);
  }

  @Get(":id")
  getOne(@CurrentUser() user: JwtPayloadUser, @Param("id", ParseResourceIdPipe) id: string) {
    return this.leads.getDetail(user.userId, id);
  }
}
