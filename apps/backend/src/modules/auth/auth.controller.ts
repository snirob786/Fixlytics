import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { CurrentUser, type JwtPayloadUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import {
  attachAuthCookies,
  AUTH_REFRESH_COOKIE,
  clearAuthCookies,
} from "./auth-cookies";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.register(dto.email, dto.password);
    attachAuthCookies(res, this.config, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return { user: tokens.user };
  }

  @Public()
  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    attachAuthCookies(res, this.config, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return { user: tokens.user };
  }

  @Public()
  @Post("refresh")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[AUTH_REFRESH_COOKIE] ?? dto.refreshToken;
    if (!raw || typeof raw !== "string" || raw.length < 32) {
      throw new UnauthorizedException("Refresh token required");
    }
    const tokens = await this.auth.refresh(raw);
    attachAuthCookies(res, this.config, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return { user: tokens.user };
  }

  @Public()
  @Post("logout")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[AUTH_REFRESH_COOKIE] ?? dto.refreshToken;
    if (raw && typeof raw === "string" && raw.length >= 32) {
      await this.auth.logout(raw);
    }
    clearAuthCookies(res, this.config);
    return { ok: true as const };
  }

  @Get("me")
  @SkipThrottle()
  me(@CurrentUser() user: JwtPayloadUser) {
    return { id: user.userId, email: user.email };
  }
}
