import type { Response } from "express";
import type { ConfigService } from "@nestjs/config";

export const AUTH_ACCESS_COOKIE = "fixlytics_access";
export const AUTH_REFRESH_COOKIE = "fixlytics_refresh";

const cookieBase = (config: ConfigService) => {
  const secure = config.get<string>("NODE_ENV") === "production";
  return { httpOnly: true as const, secure, sameSite: "lax" as const, path: "/" };
};

/** Parse values like `15m`, `1h` into milliseconds for Set-Cookie maxAge. */
export function accessCookieMaxAgeMs(jwtAccessExpires: string): number {
  const m = /^(\d+)\s*(s|m|h|d)$/i.exec(jwtAccessExpires.trim());
  if (!m) return 15 * 60 * 1000;
  const n = Number.parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

export function attachAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const base = cookieBase(config);
  const accessMs = accessCookieMaxAgeMs(config.get<string>("JWT_ACCESS_EXPIRES", "15m"));
  const refreshDays = config.get<number>("JWT_REFRESH_EXPIRES_DAYS", 7);
  const refreshMs = refreshDays * 24 * 60 * 60 * 1000;

  res.cookie(AUTH_ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: accessMs });
  res.cookie(AUTH_REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: refreshMs });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = cookieBase(config);
  res.clearCookie(AUTH_ACCESS_COOKIE, base);
  res.clearCookie(AUTH_REFRESH_COOKIE, base);
}
