import { auth } from "@/auth"
import { redirect } from "next/navigation"

/**
 * Get the current authenticated user, or null if not logged in.
 * Use in Server Components to conditionally render content.
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

/**
 * Require authentication. Redirects to /auth if not logged in.
 * Use in Server Components that must be behind auth.
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth")
  }

  return session.user
}
