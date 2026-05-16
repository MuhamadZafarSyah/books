import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";

const authRoutes = ["/auth"];
const publicRoutes = ["/", "/api"];
const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;

  // Let requests for assets in /public pass through untouched.
  if (PUBLIC_FILE_PATTERN.test(nextUrl.pathname)) {
    return NextResponse.next();
  }

  const session = await auth();
  const isLoggedIn = !!session?.user;

  const isAuthRoute = authRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
  );

  const isPublicRoute = publicRoutes.some(
    (route) =>
      nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
  );

  // Redirect logged-in users away from auth pages to dashboard
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Allow public routes without auth
  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(
      new URL(`/auth/login?callbackUrl=${callbackUrl}`, nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth routes)
     * - api/pusher (Pusher channel auth — must respond with JSON, never redirect)
     * - api/books (public-ish book search/detail routes also auth-gated inside)
     * - api/ai (AI chat endpoints, gated inside)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static assets (svg, png, jpg, etc.)
     */
    "/((?!api/auth|api/pusher|api/books|api/ai|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
