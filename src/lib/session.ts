import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";

/**
 * Get the current authenticated user, or null if not logged in.
 * Use in Server Components to conditionally render content.
 */
export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      image: true,
      banner: true,
      bio: true,
      location: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Require authentication. Redirects to /auth if not logged in.
 * Use in Server Components that must be behind auth.
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}
