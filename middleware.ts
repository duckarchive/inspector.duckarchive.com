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

// Create next-intl middleware for locale routing
const intlMiddleware = createMiddleware(routing);

function corsMiddleware(req: NextRequest) {
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  if (CORS_ALLOWED_ORIGINS.includes(origin)) {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      [
        "Accept-Version",
        "Accept",
        "Authorization",
        "Cache-Control",
        "Content-Length",
        "Content-MD5",
        "Content-Type",
        "Date",
        "Pragma",
        "Priority",
        "X-Api-Version",
        "X-CSRF-Token",
        "X-Requested-With",
      ].join(", "),
    );
    headers.set("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers });
    }

    return NextResponse.next({ headers });
  }

  return null;
}

export function middleware(req: NextRequest) {
  // Apply CORS first
  const corsResponse = corsMiddleware(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Apply next-intl locale routing
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, etc.)
    "/((?!_next|api|.*\\..*|monitoring|health).*)",
  ],
};
