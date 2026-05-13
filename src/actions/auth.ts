"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { AuthError } from "next-auth";

type ActionResult = { success: boolean; error?: string };

// ── Flow 2: Register by Email ───────────────────────────────

export async function registerByEmail(email: string): Promise<ActionResult> {
  try {
    // Rate limit
    const rateCheck = await checkRateLimit(`register:${email}`);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "Too many requests. Please try again later.",
      };
    }

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    // Check if user already exists — return success regardless to avoid leaking info
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: true };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Upsert pending registration (handles re-registration attempts)
    await prisma.pendingRegistration.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires },
    });

    // Send verification email
    await sendVerificationEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("registerByEmail error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// ── Flow 2: Verify Email Token ──────────────────────────────

export async function verifyEmailToken(
  token: string,
): Promise<ActionResult & { setPasswordToken?: string }> {
  try {
    if (!token) {
      return { success: false, error: "Invalid token." };
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { token },
    });

    if (!pending || pending.expires < new Date()) {
      return { success: false, error: "Token is invalid or has expired." };
    }

    // Generate a one-time set-password token
    const setPasswordToken = crypto.randomBytes(32).toString("hex");
    const setPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Transaction: create user + delete pending + store set-password token
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: pending.email,
          emailVerified: new Date(),
        },
      }),
      prisma.pendingRegistration.delete({
        where: { token },
      }),
      prisma.verificationToken.create({
        data: {
          identifier: pending.email,
          token: setPasswordToken,
          expires: setPasswordExpires,
        },
      }),
    ]);

    return { success: true, setPasswordToken };
  } catch (error) {
    console.error("verifyEmailToken error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ── Flow 2b: Set Password ───────────────────────────────────

export async function setPassword(
  token: string,
  password: string,
): Promise<ActionResult> {
  try {
    if (!token || !password) {
      return { success: false, error: "Token and password are required." };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters.",
      };
    }

    // Find the set-password token
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: { token },
    });

    if (!verificationRecord || verificationRecord.expires < new Date()) {
      return { success: false, error: "Token is invalid or has expired." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Transaction: update user password + invalidate token
    await prisma.$transaction([
      prisma.user.update({
        where: { email: verificationRecord.identifier },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationRecord.identifier,
            token: verificationRecord.token,
          },
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("setPassword error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ── Flow 3: Login with Credentials ──────────────────────────

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<ActionResult> {
  try {
    // Rate limit
    const rateCheck = await checkRateLimit(`login:${email}`);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
      };
    }

    // Validate inputs
    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." };
        default:
          return { success: false, error: "An error occurred during login." };
      }
    }
    // Re-throw non-auth errors (e.g. NEXT_REDIRECT)
    throw error;
  }
}

// ── Flow 1: Login with Google ───────────────────────────────

export async function loginWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

// ── Logout ──────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

// ── Resend Verification ─────────────────────────────────────

export async function resendVerification(email: string): Promise<ActionResult> {
  try {
    // Rate limit
    const rateCheck = await checkRateLimit(`resend:${email}`);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "Too many requests. Please try again later.",
      };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email },
    });

    if (!pending) {
      // Don't reveal whether a pending registration exists
      return { success: true };
    }

    // Regenerate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.pendingRegistration.update({
      where: { email },
      data: { token, expires },
    });

    await sendVerificationEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("resendVerification error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
