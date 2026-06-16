import { handlers } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const { GET: originalGET, POST } = handlers;

async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("error")) {
    return NextResponse.redirect(new URL("/auth/login", request.nextUrl.origin));
  }

  return originalGET(request);
}

export { GET, POST };
