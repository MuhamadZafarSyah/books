import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  CalendarHeart,
  Handshake,
  MapPin,
  Star,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CurrentlyReadingStrip } from "@/features/dashboard/components/overview/currently-reading-strip";
import { MyCirclesList } from "@/features/dashboard/components/overview/my-circles-list";
import { ProfileReviewsList } from "@/features/dashboard/components/overview/profile-reviews-list";
import { ProfileShelfStrip } from "@/features/dashboard/components/overview/profile-shelf-strip";
import { RankPill } from "@/features/dashboard/components/overview/rank-pill";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
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
 *   booksRead, bisa-dipinjam).
 * - Section "Buku bisa dipinjam" hadir karena ini fitur khas pengunjung
 *   (bukan profil sendiri).
 * - Tidak ada section "Aktivitas kamu" karena loader publik sengaja tidak
 *   memuat ledger pribadi user lain (privasi sederhana).
 */
export function PublicProfileShell({ profile }: PublicProfileShellProps) {
  const { user } = profile;
  const displayName = user.name ?? user.username ?? "Pembaca";
  const banner = user.banner?.trim();

  // Tampilkan publicShelf apa adanya — viewer-other berhak melihat semua
  // status yang sudah dipublikasikan (`READING/FINISHED/ON_HOLD/...`).
  // Limit 8 entri terbaru agar strip tetap ringan.
  const recentlyRead: DashboardBookCard[] = profile.publicShelf
    .slice(0, 8)
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

  const currentlyReading: DashboardBookCard[] = profile.currentlyReading.map(
    (item) => ({
      id: item.book.id,
      shelfRowId: item.id,
      title: item.book.title,
      author: item.book.author,
      coverUrl: item.book.coverUrl,
      status: item.status,
      progress: item.progress,
      updatedAt: item.updatedAt,
    }),
  );

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
    {
      label: "Bisa dipinjam",
      value: formatNumber(profile.borrowableBooks.length),
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
                className="object-cover"
              />
            ) : null}
          </div>

          <div className="relative -mt-12 flex flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-end sm:gap-5 sm:px-6">
            <Avatar className="size-20 shrink-0 ring-4 ring-background sm:size-24">
              <AvatarImage src={user.image ?? undefined} alt={displayName} />
              <AvatarFallback className="text-lg">
                {getInitials(user.name ?? user.username)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2 sm:pb-1">
              <div className="space-y-0.5">
                <h1 className="line-clamp-1 font-heading text-2xl font-semibold tracking-tight text-foreground">
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

      <CurrentlyReadingStrip
        books={currentlyReading}
        emptyHint={`${displayName} belum punya buku yang sedang berjalan secara publik.`}
      />

      <ProfileShelfStrip
        books={recentlyRead}
        emptyHint="Rak publik masih kosong."
      />

      <ProfileReviewsList
        reviews={recentReviews}
        emptyHint="Belum ada review yang dipublikasikan."
      />

      <UpcomingEventsList
        events={profile.upcomingEvents}
        emptyHint="Belum ada agenda mendatang yang dibagikan."
      />

      <MyCirclesList
        circles={profile.myCircles}
        emptyHint="Belum bergabung di circle publik."
      />

      <BorrowableBooksList books={profile.borrowableBooks} />
    </div>
  );
}

type BorrowableItem = PublicProfile["borrowableBooks"][number];

function BorrowableBooksList({ books }: { books: BorrowableItem[] }) {
  return (
    <section aria-labelledby="profile-borrowable">
      <SectionHeading
        title="Buku bisa dipinjam"
        description="Koleksi yang ditandai pemilik untuk dipinjam komunitas."
      />

      {books.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
          Belum ada buku yang ditandai bisa dipinjam.
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-border/60">
          {books.map((item, index) => (
            <li key={item.id}>
              {index > 0 ? <Separator /> : null}
              <Link
                href={`/dashboard/explore/books/${item.book.id}/reviews`}
                className="flex items-center gap-3 px-3 py-3 transition-colors duration-200 hover:bg-muted/40 sm:gap-4 sm:px-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Handshake aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {item.book.title}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {item.book.author}
                  </p>
                </div>
                <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:inline-flex">
                  <BookOpen aria-hidden="true" className="size-3" />
                  Tersedia
                </span>
                <Star
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground/40 sm:hidden"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
