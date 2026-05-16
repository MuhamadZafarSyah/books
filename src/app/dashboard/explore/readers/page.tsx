import type { Metadata } from "next";

import { UserSearchExperience } from "@/features/users/components/user-search-experience";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cari Pembaca | Shelfgram",
  description: "Temukan pembaca lain di Shelfgram berdasarkan nama atau username.",
};

export default async function ExploreReadersPage() {
  await requireAuth();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Cari pembaca
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Temukan teman baca berdasarkan nama atau username, lalu mulai diskusi
          atau ikuti aktivitas mereka.
        </p>
      </header>

      <UserSearchExperience />
    </div>
  );
}
