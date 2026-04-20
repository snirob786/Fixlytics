import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function apiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  return url.replace(/\/$/, "");
}

export async function middleware(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";
  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      method: "GET",
      headers: { cookie, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const login = new URL("/login", request.nextUrl.origin);
      login.searchParams.set("from", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
