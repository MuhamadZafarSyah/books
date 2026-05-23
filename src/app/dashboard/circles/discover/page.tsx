import type { Metadata } from "next";
import Link from "next/link";
import { Library, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { serializeCircleSummary } from "@/features/reading-circle/lib/serializers";
import { ReadingCircleDiscoverCard } from "@/features/reading-circle/components/reading-circle-discover-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Circle | Shelfgram",
  description: "Temukan reading circle publik di Shelfgram.",
};

export default async function ReadingCirclesDiscoverPage() {
  const user = await requireAuth();

  const [publicCircles, myMemberships] = await Promise.all([
    prisma.readingCircle.findMany({
      where: { privacy: "PUBLIC" },
      orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }],
      take: 24,
    }),
    prisma.readingCircleMember.findMany({
      where: { userId: user.id },
      select: { circleId: true, role: true },
    }),
  ]);

  const myMap = new Map(
    myMemberships.map((membership) => [membership.circleId, membership.role]),
  );
  const items = publicCircles.map((circle) =>
    serializeCircleSummary(circle, myMap.get(circle.id) ?? null),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Discover Circle
          </h1>
          <p className="text-sm text-muted-foreground">
            Reading circle publik yang aktif di komunitas Shelfgram.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="cursor-pointer"
          >
            <Link href="/dashboard/circles">
              <Library aria-hidden="true" className="size-3.5" />
              Circle saya
            </Link>
          </Button>
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/dashboard/explore">
              <Plus aria-hidden="true" className="size-3.5" />
              Buat circle
            </Link>
          </Button>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyDiscover />
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {items.map((circle) => (
            <li key={circle.id}>
              <ReadingCircleDiscoverCard circle={circle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyDiscover() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center">
      <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
        Belum ada circle publik
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Jadilah yang pertama membuat reading circle dari sebuah buku di halaman
        Jelajahi.
      </p>
      <Button asChild size="sm" className="mt-1 cursor-pointer">
        <Link href="/dashboard/explore">
          <Plus aria-hidden="true" className="size-3.5" />
          Mulai dari Jelajahi
        </Link>
      </Button>
    </div>
  );
}
