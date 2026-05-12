import { requireAuth } from "@/lib/session";
import { ProfileHeader } from "@/features/dashboard/components/profile-header";
import { ProfileStats } from "@/features/dashboard/components/profile-stats";
import { ProfileActivity } from "@/features/dashboard/components/profile-activity";

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProfileHeader user={user} />
      <ProfileStats />
      <ProfileActivity />
    </div>
  );
}
