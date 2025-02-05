import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
  );
  headers.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers });
  }

  return NextResponse.next({ headers });
}

export const config = {
  matcher: ['/api/*'],
};
