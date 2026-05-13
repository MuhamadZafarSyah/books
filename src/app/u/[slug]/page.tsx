import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Handshake, Star, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatQuickDock } from "@/features/chat/components/chat-quick-dock";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { PublicProfileActions } from "@/features/public-profile/components/public-profile-actions";
import { ProfileActivity } from "@/features/dashboard/components/profile-activity";
import { ProfileHeader } from "@/features/dashboard/components/profile-header";
import { ProfileStats } from "@/features/dashboard/components/profile-stats";
import { getPublicProfileBySlug } from "@/lib/public-profile";
import { requireAuth } from "@/lib/session";

type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfileBySlug>>>;

function averageRating(reviews: PublicProfile["latestReviews"]) {
  const ratedReviews = reviews.filter((review) => review.rating !== null);
  if (ratedReviews.length === 0) return "-";

  const total = ratedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0);
  return (total / ratedReviews.length).toFixed(1);
}

function statusCount(profile: PublicProfile, status: "WANT_TO_READ" | "READING" | "FINISHED") {
  return profile.publicShelf.filter((item) => item.status === status).length;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfileBySlug(slug);

  if (!profile) {
    return { title: "Profil tidak ditemukan | Shelfgram" };
  }

  return {
    title: `${profile.user.name ?? profile.user.username ?? "Pembaca"} | Shelfgram`,
    description: profile.user.bio ?? "Profil publik pembaca Shelfgram.",
  };
}

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await requireAuth();
  const profile = await getPublicProfileBySlug(slug);

  if (!profile) notFound();

  const miniStats = [
    { label: "Rak Publik", value: String(profile.stats.publicBookCount) },
    { label: "Bisa Dipinjam", value: String(profile.borrowableBooks.length) },
    { label: "Rata-rata Rating", value: averageRating(profile.latestReviews) },
    { label: "Review", value: String(profile.stats.reviewCount) },
  ];
  const shelfBooks = profile.publicShelf.map((item) => ({
    id: item.id,
    title: item.book.title,
    author: item.book.author,
    cover: item.book.coverUrl,
    rating: null,
  }));
  const shelfSignals = [
    { name: "Sedang Dibaca", count: statusCount(profile, "READING") },
    { name: "Selesai", count: statusCount(profile, "FINISHED") },
    { name: "Ingin Dibaca", count: statusCount(profile, "WANT_TO_READ") },
    { name: "Bisa Dipinjam", count: profile.borrowableBooks.length },
  ].filter((item) => item.count > 0);

  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-0 overflow-hidden">
        <AppSidebar user={currentUser} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <DashboardHeader />
          <div className="hide-scrollbar min-h-0 flex-1 overflow-auto p-4 md:p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <ProfileHeader
                actions={
                  <PublicProfileActions
                    followerCount={profile.stats.followerCount}
                    isFollowing={profile.viewer.isFollowing}
                    isOwnProfile={profile.viewer.isOwnProfile}
                    slug={profile.user.slug}
                    targetUserId={profile.user.id}
                  />
                }
                showPublicProfileLink={false}
                stats={[
                  { label: "Buku Dibaca", value: String(profile.stats.booksReadCount), icon: BookOpen },
                  { label: "Pengikut", value: String(profile.stats.followerCount), icon: Users },
                  { label: "Review", value: String(profile.stats.reviewCount), icon: Star },
                ]}
                user={profile.user}
              />

              <ProfileStats
                books={shelfBooks}
                booksTitle="Rak Publik"
                genres={shelfSignals.length > 0 ? shelfSignals : undefined}
                genresTitle="Sinyal Rak"
                miniStats={miniStats}
              />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium normal-case tracking-normal text-muted-foreground">
                    Buku yang Bisa Dipinjam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-5">
                  {profile.borrowableBooks.length > 0 ? (
                    profile.borrowableBooks.map((item) => (
                      <div className="flex items-center gap-3 rounded-lg border border-border/70 p-3" key={item.id}>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Handshake aria-hidden="true" className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.book.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.book.author}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                          Available
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Belum ada buku yang ditandai bisa dipinjam.
                    </div>
                  )}
                </CardContent>
              </Card>

              <ProfileActivity />
            </div>
          </div>
          <ChatQuickDock />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
