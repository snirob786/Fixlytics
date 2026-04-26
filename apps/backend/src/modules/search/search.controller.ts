import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SearchRequestDto } from "./dto/search-request.dto";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  run(@Body() dto: SearchRequestDto) {
    return this.searchService.search(dto);
  }

  @Get(":hash")
  getByHash(@Param("hash") hash: string) {
    return this.searchService.getByHash(hash);
  }
}
