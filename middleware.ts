import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CORS_ALLOWED_ORIGINS = [
  "https://duckarchive.com",
  "https://index.duckarchive.com",
  "https://inspector.duckarchive.com",
  "chrome-extension://gldlgeliohimejlfpgihbplkchibadim",
];

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  if (CORS_ALLOWED_ORIGINS.includes(origin)) {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );
    headers.set("Access-Control-Allow-Credentials", "true");
  
    if (req.method === "OPTIONS") {
      return NextResponse.next({ headers });
    }
  
    return NextResponse.next({ headers });
  };
}
