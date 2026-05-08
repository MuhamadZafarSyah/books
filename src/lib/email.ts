import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

/**
 * Send a verification email with a tokenized link.
 * The link points to GET /api/auth/verify-email?token=xxx
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
    to: email,
    subject: "Verify your email address",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">
          Verify your email
        </h2>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to verify your email address and complete your registration.
          This link will expire in <strong>1 hour</strong>.
        </p>
        <a
          href="${verificationUrl}"
          style="display: inline-block; background-color: #111; color: #fff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;"
        >
          Verify Email
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 32px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
