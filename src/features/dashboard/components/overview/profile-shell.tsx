import Link from "next/link";
import Image from "next/image";
import { CalendarHeart, Edit, ExternalLink, MapPin } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/features/dashboard/components/overview/activity-feed";
import { MyCirclesList } from "@/features/dashboard/components/overview/my-circles-list";
import { ProfileReviewsList } from "@/features/dashboard/components/overview/profile-reviews-list";
import { ProfileShelfStrip } from "@/features/dashboard/components/overview/profile-shelf-strip";
import { ProfileQuotesList } from "@/features/book-quotes/components/profile-quotes-list";
import { RankPill } from "@/features/dashboard/components/overview/rank-pill";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import { StatsStrip } from "@/features/dashboard/components/overview/stats-strip";
import { UpcomingEventsList } from "@/features/dashboard/components/overview/upcoming-events-list";
import {
  formatNumber,
  getInitials,
} from "@/features/dashboard/lib/format";
import { formatJoinedAt } from "@/utils/sharedUtils";
import type {
  DashboardActivityItem,
  ProfileOverview,
} from "@/lib/dashboard/overview-types";

type ProfileShellProps = {
  overview: ProfileOverview;
  /** Aktivitas terbaru milik user (hanya event-nya sendiri). */
  ownActivity: DashboardActivityItem[];
};

/**
 * Halaman Profil pribadi.
 *
 * Komposisi:
 * 1. Cover banner tipis + avatar + nama + meta singkat (lokasi, bergabung).
 * 2. Stat strip (6 angka: sedang dibaca, selesai, want, review, follower, following).
 * 3. Rank weekly + all-time leaderboard.
 * 4. Section: rak buku, review terbaru, agenda mendatang, circle saya, aktivitas pribadi.
 *
 * Mobile-first: section mengalir vertikal tanpa nested card. Banner tetap
 * minimalist, hanya gradient halus jika user belum upload banner.
 */
export function ProfileShell({ overview, ownActivity }: ProfileShellProps) {
  const { user, stats } = overview;
  const displayName = user.name ?? user.username ?? "Pembaca";
  const banner = user.banner?.trim();

  const statsItems = [
    { label: "Sedang dibaca", value: formatNumber(stats.booksReading) },
    { label: "Selesai", value: formatNumber(stats.booksFinished) },
    { label: "Ingin baca", value: formatNumber(stats.booksWantToRead) },
    { label: "Review", value: formatNumber(stats.reviewCount) },
    { label: "Pengikut", value: formatNumber(stats.followerCount) },
    { label: "Mengikuti", value: formatNumber(stats.followingCount) },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Banner + identity row */}
      <header className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-border/60">
          <div className="relative aspect-[16/6] w-full bg-gradient-to-br from-primary/20 via-primary/5 to-background">
            {banner ? (
              <Image
                src={banner}
                alt={`Banner profil ${displayName}`}
                fill
                sizes="(max-width: 768px) 100vw, 720px"
                className="object-contain"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
          </div>

          <div className="relative z-10 -mt-12 flex flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-end sm:gap-5 sm:px-6">
            <Avatar className="size-20 shrink-0 ring-4 ring-background sm:size-24">
              <AvatarImage src={user.image ?? undefined} alt={displayName} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name ?? user.username)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2 sm:pb-1">
              <div className="space-y-0.5">
                <h1 className="line-clamp-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-white sm:drop-shadow-[0_2px_10px_rgb(0_0_0/0.9)]">
                  {displayName}
                </h1>
                {user.username ? (
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {user.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3" />
                    {user.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <CalendarHeart aria-hidden="true" className="size-3" />
                  Bergabung {formatJoinedAt(user.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pb-1">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                <Link href={`/u/${user.slug}`}>
                  <ExternalLink
                    aria-hidden="true"
                    className="size-3.5"
                  />
                  Profil publik
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="cursor-pointer"
              >
                <Link href="/dashboard/profile/edit">
                  <Edit aria-hidden="true" className="size-3.5" />
                  Edit profil
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {user.bio ? (
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/90">
            {user.bio}
          </p>
        ) : null}

        <StatsStrip stats={statsItems} />

        <div className="flex flex-wrap items-center gap-2">
          <RankPill
            data={overview.leaderboardWeekly}
            href="/dashboard/leaderboard"
            label="Minggu ini"
          />
          <RankPill
            data={overview.leaderboardAllTime}
            href="/dashboard/leaderboard"
            label="Sepanjang masa"
          />
        </div>
      </header>

      {/* Rak buku dengan tab status (menggantikan CurrentlyReadingStrip) */}
      <ProfileShelfStrip books={overview.recentlyRead} editable />

      <ProfileReviewsList reviews={overview.recentReviews} />

      <ProfileQuotesList quotes={overview.recentQuotes} />

      <UpcomingEventsList
        events={[...overview.hostedEvents, ...overview.joinedEvents]
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          )
          .slice(0, 4)}
        emptyHint="Belum ada agenda mendatang yang diikuti."
      />

      <MyCirclesList
        circles={overview.myCircles}
        emptyHint="Belum bergabung di circle baca."
      />

      <section aria-labelledby="profile-own-activity" className="space-y-3">
        <SectionHeading
          title="Aktivitas kamu"
          description="Aksi terbaru yang menambah poin leaderboard."
          href="/dashboard/leaderboard"
          hrefLabel="Lihat poin"
        />
        <ActivityFeed
          items={ownActivity}
          showHeading={false}
          emptyHint="Belum ada aktivitas. Mulai dari halaman Jelajahi."
        />
      </section>
    </div>
  );
}
