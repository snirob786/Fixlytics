import { Body, Controller, Get, Post } from "@nestjs/common";

import { CurrentUser, type JwtPayloadUser } from "../../common/decorators/current-user.decorator";
import { ExploreSaveDto } from "./dto/explore-save.dto";
import { ExploreSearchDto } from "./dto/explore-search.dto";
import { ExploreService } from "./explore.service";

@Controller("explore")
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @Get("config")
  config() {
    return this.explore.getConfig();
  }

  @Post("search")
  search(@CurrentUser() user: JwtPayloadUser, @Body() dto: ExploreSearchDto) {
    return this.explore.search(user.userId, dto);
  }

  @Post("save")
  save(@CurrentUser() user: JwtPayloadUser, @Body() dto: ExploreSaveDto) {
    return this.explore.save(user.userId, dto);
  }
}
