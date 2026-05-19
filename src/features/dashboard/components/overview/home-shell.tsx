import Link from "next/link";
import { CalendarHeart, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/features/dashboard/components/overview/activity-feed";
import { CurrentlyReadingStrip } from "@/features/dashboard/components/overview/currently-reading-strip";
import { MyCirclesList } from "@/features/dashboard/components/overview/my-circles-list";
import { RankPill } from "@/features/dashboard/components/overview/rank-pill";
import { StatsStrip } from "@/features/dashboard/components/overview/stats-strip";
import { UpcomingEventsList } from "@/features/dashboard/components/overview/upcoming-events-list";
import { formatNumber } from "@/features/dashboard/lib/format";
import type { DashboardOverview } from "@/lib/dashboard/overview-types";

type HomeShellProps = {
  overview: DashboardOverview;
};

/**
 * Halaman Beranda Shelfgram.
 *
 * Strukturnya mengikuti rhythm minimalist Agenda Baca dan Leaderboard:
 *
 * 1. Sapaan + rank pill viewer.
 * 2. Quick actions ringkas (Tulis review buku via jelajah, buat agenda).
 * 3. Strip stat (4 angka kunci).
 * 4. Strip "Lanjutkan baca" — buku yang sedang berjalan.
 * 5. Section: agenda mendatang, circle saya, aktivitas komunitas.
 *
 * Mobile-first: semua section single-column, scroll horizontal hanya
 * dipakai untuk strip buku. Desktop tetap single-column max 720px supaya
 * konten terasa intim seperti feed sosial.
 */
export function HomeShell({ overview }: HomeShellProps) {
  const firstName = overview.user.name?.split(" ")[0] ?? "Pembaca";
  const stats = [
    {
      label: "Sedang dibaca",
      value: formatNumber(overview.shelfCounts.reading),
    },
    {
      label: "Selesai",
      value: formatNumber(overview.shelfCounts.finished),
    },
    {
      label: "Review",
      value: formatNumber(overview.reviewCount),
    },
    {
      label: "Pengikut",
      value: formatNumber(overview.followerCount),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Halo, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Sambungkan momen baca hari ini.
            </p>
          </div>
          <RankPill
            data={overview.leaderboard}
            href="/dashboard/leaderboard"
            label="Minggu ini"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            className="cursor-pointer"
          >
            <Link href="/dashboard/explore">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Jelajahi buku
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="cursor-pointer"
          >
            <Link href="/dashboard/events/new">
              <Plus aria-hidden="true" className="size-3.5" />
              Buat agenda
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="cursor-pointer"
          >
            <Link href="/dashboard/circles">
              <CalendarHeart aria-hidden="true" className="size-3.5" />
              Circle baca
            </Link>
          </Button>
        </div>
      </header>

      <StatsStrip stats={stats} />

      <CurrentlyReadingStrip books={overview.currentlyReading} />

      <UpcomingEventsList events={overview.upcomingEvents} />

      <MyCirclesList circles={overview.myCircles} />

      <ActivityFeed items={overview.recentActivity} />
    </div>
  );
}
