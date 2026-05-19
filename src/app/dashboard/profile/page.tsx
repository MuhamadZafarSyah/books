import { ProfileShell } from "@/features/dashboard/components/overview/profile-shell";
import {
  getProfileOverview,
  getRecentActivityForUser,
} from "@/lib/dashboard/overview-queries";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuth();

  const [overview, ownActivity] = await Promise.all([
    getProfileOverview({
      userId: user.id,
      name: user.name ?? null,
      username: user.username ?? null,
      email: user.email,
      image: user.image ?? null,
      banner: user.banner ?? null,
      bio: user.bio ?? null,
      location: user.location ?? null,
      // `getCurrentUser` mengkonversi `createdAt` ke ISO string. Konversi
      // balik ke `Date` di sini supaya signature `getProfileOverview`
      // konsisten dengan loader lain yang menerima `Date` dari Prisma.
      createdAt: new Date(user.createdAt),
    }),
    getRecentActivityForUser({ userId: user.id, limit: 10 }),
  ]);

  return <ProfileShell overview={overview} ownActivity={ownActivity} />;
}
