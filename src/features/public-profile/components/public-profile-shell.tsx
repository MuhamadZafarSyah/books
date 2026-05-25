import Image from "next/image";
import {
  CalendarHeart,
  MapPin,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MyCirclesList } from "@/features/dashboard/components/overview/my-circles-list";
import { ProfileReviewsList } from "@/features/dashboard/components/overview/profile-reviews-list";
import { ProfileShelfStrip } from "@/features/dashboard/components/overview/profile-shelf-strip";
import { ProfileQuotesList } from "@/features/book-quotes/components/profile-quotes-list";
import { RankPill } from "@/features/dashboard/components/overview/rank-pill";
import { StatsStrip } from "@/features/dashboard/components/overview/stats-strip";
import { UpcomingEventsList } from "@/features/dashboard/components/overview/upcoming-events-list";
import {
  formatNumber,
  getInitials,
} from "@/features/dashboard/lib/format";
import { PublicProfileActions } from "@/features/public-profile/components/public-profile-actions";
import { formatJoinedAt } from "@/utils/sharedUtils";
import type { getPublicProfileBySlug } from "@/lib/public-profile";
import type {
  DashboardBookCard,
  DashboardReviewCard,
} from "@/lib/dashboard/overview-types";

type PublicProfile = NonNullable<
  Awaited<ReturnType<typeof getPublicProfileBySlug>>
>;

type PublicProfileShellProps = {
  profile: PublicProfile;
};

/**
 * Halaman profil publik (viewer-other) untuk `/u/[slug]`.
 *
 * Menggunakan komponen yang sama dengan halaman profil pribadi agar
 * konsistensi visual tetap terjaga, tetapi:
 *
 * - Banner action diganti dengan `PublicProfileActions` (Follow / Message).
 * - Stat strip menyesuaikan ke metrik publik (total rak, follower, review,
 *   dan booksRead).
 * - Tidak ada section "Aktivitas kamu" karena loader publik sengaja tidak
 *   memuat ledger pribadi user lain (privasi sederhana).
 */
export function PublicProfileShell({ profile }: PublicProfileShellProps) {
  const { user } = profile;
  const displayName = user.name ?? user.username ?? "Pembaca";
  const banner = user.banner?.trim();

  // Tampilkan publicShelf apa adanya — viewer-other berhak melihat semua
  // status yang sudah dipublikasikan (`READING/FINISHED/ON_HOLD/...`).
  const recentlyRead: DashboardBookCard[] = profile.publicShelf
    .map((item) => ({
      id: item.book.id,
      shelfRowId: item.id,
      title: item.book.title,
      author: item.book.author,
      coverUrl: item.book.coverUrl,
      status: item.status,
      progress: item.progress,
      updatedAt: item.updatedAt,
    }));

  // Gabungkan currentlyReading yang belum ada di publicShelf supaya tab
  // "Berjalan" tetap terisi meskipun buku tersebut belum masuk slice
  // publicShelf (mis. karena limit).
  const existingIds = new Set(recentlyRead.map((b) => b.id));
  for (const item of profile.currentlyReading) {
    if (!existingIds.has(item.book.id)) {
      recentlyRead.push({
        id: item.book.id,
        shelfRowId: item.id,
        title: item.book.title,
        author: item.book.author,
        coverUrl: item.book.coverUrl,
        status: item.status,
        progress: item.progress,
        updatedAt: item.updatedAt,
      });
    }
  }

  // Recent reviews dari loader publik tidak menyertakan `coverUrl`; kita
  // sintesis dari publicShelf bila judulnya cocok agar UI tidak menampilkan
  // placeholder kosong tanpa alasan.
  const coverByBookId = new Map<string, string | null>();
  for (const item of profile.publicShelf) {
    coverByBookId.set(item.book.id, item.book.coverUrl);
  }
  const recentReviews: DashboardReviewCard[] = profile.latestReviews.map(
    (review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      book: {
        id: review.book.id,
        title: review.book.title,
        author: review.book.author,
        coverUrl: coverByBookId.get(review.book.id) ?? null,
      },
    }),
  );

  const stats = [
    {
      label: "Rak publik",
      value: formatNumber(profile.stats.publicBookCount),
    },
    {
      label: "Selesai",
      value: formatNumber(profile.stats.booksReadCount),
    },
    {
      label: "Review",
      value: formatNumber(profile.stats.reviewCount),
    },
    {
      label: "Pengikut",
      value: formatNumber(profile.stats.followerCount),
    },
    {
      label: "Mengikuti",
      value: formatNumber(profile.stats.followingCount),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
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
          </div>
        </div>

        {user.bio ? (
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/90">
            {user.bio}
          </p>
        ) : null}

        <PublicProfileActions
          followerCount={profile.stats.followerCount}
          isFollowing={profile.viewer.isFollowing}
          isOwnProfile={profile.viewer.isOwnProfile}
          slug={user.slug}
          targetUserId={user.id}
        />

        <StatsStrip stats={stats} />

        <div className="flex flex-wrap items-center gap-2">
          <RankPill
            data={profile.leaderboardWeekly}
            href="/dashboard/leaderboard"
            label="Minggu ini"
          />
          <RankPill
            data={profile.leaderboardAllTime}
            href="/dashboard/leaderboard"
            label="Sepanjang masa"
          />
        </div>
      </header>

      <ProfileShelfStrip
        books={recentlyRead}
        emptyHint="Rak publik masih kosong."
      />

      <ProfileReviewsList
        reviews={recentReviews}
        emptyHint="Belum ada review yang dipublikasikan."
      />

      <ProfileQuotesList
        quotes={profile.publicQuotes}
        emptyHint="Belum ada kutipan yang dipublikasikan."
      />

      <UpcomingEventsList
        events={profile.upcomingEvents}
        emptyHint="Belum ada agenda mendatang yang dibagikan."
      />

      <MyCirclesList
        circles={profile.myCircles}
        emptyHint="Belum bergabung di circle publik."
      />
    </div>
  );
}
