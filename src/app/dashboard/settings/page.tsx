import type { Metadata } from "next";

import { requireAuth } from "@/lib/session";
import { SettingsClient } from "@/features/settings/components/settings-client";

export const metadata: Metadata = {
  title: "Pengaturan | Shelfgram",
  description: "Atur tampilan dan preferensi akun Shelfgram.",
};

export default async function SettingsPage() {
  await requireAuth();

  return <SettingsClient />;
}
