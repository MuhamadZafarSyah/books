import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/actions/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Called when the user clicks the verification link in their email.
 * On success: redirects to /auth/set-password?token=<set-password-token>
 * On failure: redirects to /auth/login?error=invalid_token
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_token", APP_URL),
    );
  }

  const result = await verifyEmailToken(token);

  if (result.success && result.setPasswordToken) {
    return NextResponse.redirect(
      new URL(`/auth/set-password?token=${result.setPasswordToken}`, APP_URL),
    );
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=invalid_token", APP_URL),
  );
}
