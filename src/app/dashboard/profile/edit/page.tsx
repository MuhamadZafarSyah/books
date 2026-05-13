import type { Metadata } from "next";

import { EditProfileForm } from "@/features/dashboard/components/edit-profile-form";
import { requireAuth } from "@/lib/session";

export const metadata: Metadata = {
  title: "Edit Profil | Shelfgram",
};

export default async function EditProfilePage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <EditProfileForm user={user} />
    </div>
  );
}
