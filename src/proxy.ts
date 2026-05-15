import type { NextRequest } from "next/server";

import { proxy as handleProxy } from "@/lib/proxy";

export function proxy(request: NextRequest) {
  return handleProxy(request);
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
