import { LeaderboardPageClient } from "@/features/leaderboard/components/leaderboard-page-client";
import type {
  LeaderboardPeriodKey,
  LeaderboardScopeKey,
} from "@/features/leaderboard/types";

export type LeaderboardShellProps = {
  viewerUserId: string;
  initialPeriod?: LeaderboardPeriodKey;
  initialScope?: LeaderboardScopeKey;
};

/**
 * Server Component shell untuk halaman leaderboard.
 *
 * Tata letak mengikuti rhythm `event-list-shell.tsx` (Agenda Baca):
 * heading ringkas, subhead satu baris, lalu langsung delegasi ke client
 * island. Tidak ada eyebrow uppercase atau hero panjang demi menjaga
 * tampilan tetap minimalist.
 */
export function LeaderboardShell({
  viewerUserId,
  initialPeriod = "weekly",
  initialScope = "overall",
}: LeaderboardShellProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Pembaca paling aktif minggu ini di komunitas Shelfgram.
        </p>
      </header>

      <LeaderboardPageClient
        viewerUserId={viewerUserId}
        initialPeriod={initialPeriod}
        initialScope={initialScope}
      />
    </div>
  );
}
