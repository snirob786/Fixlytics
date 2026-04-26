import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function apiBase(): string {
  const url =
    process.env.NEXT_INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api/v1";
  return url.replace(/\/$/, "");
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const cookie = request.headers.get("cookie") ?? "";
  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      method: "GET",
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      if (pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", origin));
      }
      return NextResponse.next();
    }
    const login = new URL("/login", origin);
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/results")) {
      login.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(login);
  } catch {
    const login = new URL("/login", origin);
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/results")) {
      login.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/results", "/login"],
};
