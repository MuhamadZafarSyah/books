import { requireAuth } from "@/lib/session";
import { ContinueReading } from "@/features/dashboard/components/continue-reading";
import { ReadingFeed } from "@/features/dashboard/components/reading-feed";
import { TrendingBooks } from "@/features/dashboard/components/trending-books";
import { ReadingChallenge } from "@/features/dashboard/components/reading-challenge";
import { QuickActions } from "@/features/dashboard/components/quick-actions";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-8">
      {/* Greeting + Quick Actions */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            Halo, {user.name?.split(" ")[0] ?? "Pembaca"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lanjutkan petualangan membacamu hari ini.
          </p>
        </div>
        <QuickActions />
      </section>

      {/* Continue Reading — hero section */}
      <ContinueReading />

      {/* Two column layout on desktop */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ReadingFeed />
        </div>
        <div className="space-y-6">
          <ReadingChallenge />
          <TrendingBooks />
        </div>
      </div>
    </div>
  );
}
