import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const CORS_ALLOWED_ORIGINS = [
  "https://duckarchive.com",
  "https://index.duckarchive.com",
  "https://inspector.duckarchive.com",
  "chrome-extension://gldlgeliohimejlfpgihbplkchibadim",
];

const intlMiddleware = createMiddleware(routing);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Handle CORS for ALL matched routes (including API)
  const origin = req.headers.get("origin");

  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    // For OPTIONS requests, return 204 immediately
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
          "Access-Control-Allow-Headers":
            "Accept-Version, Accept, Authorization, Cache-Control, Content-Length, Content-MD5, Content-Type, Date, Pragma, Priority, X-Api-Version, X-CSRF-Token, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }
  }

  // 2. Logic Split: If it's an API route, don't run i18n
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
  }

  // 3. For everything else (pages), run i18n middleware
  const response = intlMiddleware(req);

  // Apply CORS headers to i18n response if needed
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and internal Next.js paths
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
