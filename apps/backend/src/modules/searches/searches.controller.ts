import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, type JwtPayloadUser } from "../../common/decorators/current-user.decorator";
import { CreateSearchDto } from "./dto/create-search.dto";
import { ListSearchesQuery } from "./dto/list-searches.query";
import { RunSearchDto } from "./dto/run-search.dto";
import { UpdateSearchDto } from "./dto/update-search.dto";
import { SearchesService } from "./searches.service";

@Controller("searches")
export class SearchesController {
  constructor(private readonly searches: SearchesService) {}

  @Post()
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateSearchDto) {
    return this.searches.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayloadUser, @Query() query: ListSearchesQuery) {
    return this.searches.list(user.userId, query);
  }

  @Get(":id/leads")
  listLeads(
    @CurrentUser() user: JwtPayloadUser,
    @Param("id") id: string,
    @Query() query: ListSearchesQuery,
  ) {
    return this.searches.listLeads(user.userId, id, query);
  }

  @Get(":id/cache/:pageIndex")
  getCache(
    @CurrentUser() user: JwtPayloadUser,
    @Param("id") id: string,
    @Param("pageIndex") pageIndex: string,
  ) {
    const n = Number(pageIndex);
    if (!Number.isInteger(n) || n < 0) {
      throw new BadRequestException("pageIndex must be a non-negative integer");
    }
    return this.searches.getCachedPage(user.userId, id, n);
  }

  @Get(":id")
  getOne(@CurrentUser() user: JwtPayloadUser, @Param("id") id: string) {
    return this.searches.getDetail(user.userId, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param("id") id: string,
    @Body() dto: UpdateSearchDto,
  ) {
    return this.searches.update(user.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtPayloadUser, @Param("id") id: string) {
    return this.searches.remove(user.userId, id);
  }

  @Post(":id/run")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  run(
    @CurrentUser() user: JwtPayloadUser,
    @Param("id") id: string,
    @Body() dto: RunSearchDto,
  ) {
    return this.searches.enqueueRun(user.userId, id, dto.resume);
  }
}
