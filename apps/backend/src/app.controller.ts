import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  @Public()
  @SkipThrottle()
  @Get("health")
  health() {
    return { status: "ok", service: "fixlytics-backend" };
  }
}
