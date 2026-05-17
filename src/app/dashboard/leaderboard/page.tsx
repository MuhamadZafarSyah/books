import type { Metadata } from "next";

import { LeaderboardShell } from "@/features/leaderboard/components/leaderboard-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard | Shelfgram",
  description:
    "Papan peringkat pembaca paling aktif di komunitas Shelfgram berdasarkan aktivitas circle, agenda baca, review, dan interaksi sosial.",
};

export default async function LeaderboardPage() {
  const viewer = await requireAuth();

  return <LeaderboardShell viewerUserId={viewer.id} />;
}
