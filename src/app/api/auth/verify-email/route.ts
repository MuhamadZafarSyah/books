import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/actions/auth";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Called when the user clicks the verification link in their email.
 * On success: redirects to /auth/set-password?token=<set-password-token>
 * On failure: redirects to /auth/login?error=invalid_token
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = requestUrl.origin;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_token", origin),
    );
  }

  const result = await verifyEmailToken(token);

  if (result.success && result.setPasswordToken) {
    return NextResponse.redirect(
      new URL(`/auth/set-password?token=${result.setPasswordToken}`, origin),
    );
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=invalid_token", origin),
  );
}
