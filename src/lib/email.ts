import nodemailer from "nodemailer";

import { getAppUrl } from "@/lib/app-url";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createTransporter() {
  const port = Number(requireEnv("SMTP_PORT"));

  if (!Number.isInteger(port)) {
    throw new Error("SMTP_PORT must be a valid number");
  }

  return nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASSWORD"),
    },
  });
}

/**
 * Send a verification email with a tokenized link.
 * The link points to GET /api/auth/verify-email?token=xxx
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const appUrl = getAppUrl();
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || requireEnv("SMTP_USER");

  await transporter.sendMail({
    from,
    to: email,
    subject: "Verify your Shelfgram email address",
    text: `Verify your email by opening this link: ${verificationUrl}\n\nThis link will expire in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1b1c19; background: #fbf9f4;">
        <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #6d5b46; margin: 0 0 16px;">
          Shelfgram
        </p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; color: #061b0e; font-size: 30px; line-height: 1.2; margin: 0 0 16px;">
          Verify your email
        </h1>
        <p style="color: #434843; font-size: 16px; line-height: 1.6; margin: 0 0 28px;">
          Click the button below to verify your email address and complete your Shelfgram registration.
          This link will expire in <strong>1 hour</strong>.
        </p>
        <a
          href="${verificationUrl}"
          style="display: inline-block; background-color: #061b0e; color: #ffffff; padding: 14px 24px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px;"
        >
          Verify Email
        </a>
        <p style="color: #737973; font-size: 13px; margin: 32px 0 0; line-height: 1.5;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
