import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Library, Sparkles } from "lucide-react";

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
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Compass aria-hidden="true" className="size-3" />
              Discover
            </span>
            <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Circle publik terbaru
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Temukan reading circle yang terbuka untuk umum, gabung dalam diskusi,
              dan ikuti progress baca bersama komunitas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="cursor-pointer rounded-full"
            >
              <Link href="/dashboard/circles">
                <Library aria-hidden="true" className="size-3.5" />
                Circle saya
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="cursor-pointer rounded-full"
            >
              <Link href="/dashboard/explore">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Buat dari buku
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
          <p className="leading-relaxed">
            <strong className="font-semibold text-foreground">Tips:</strong>{" "}
            klik kartu untuk membuka detail circle. Anda perlu menekan tombol
            &quot;Gabung&quot; di dalam circle untuk mulai memposting dan
            berkomentar.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyDiscover />
      ) : (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-base font-semibold tracking-tight">
              {items.length.toLocaleString("id-ID")} circle aktif
            </h2>
            <p className="text-xs text-muted-foreground">
              Diurutkan berdasarkan aktivitas terbaru
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((circle) => (
              <li key={circle.id}>
                <ReadingCircleDiscoverCard circle={circle} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EmptyDiscover() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <Compass aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-4 font-heading text-base font-semibold tracking-tight">
        Belum ada circle publik
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Jadilah yang pertama membuat reading circle dari sebuah buku di halaman
        Jelajahi.
      </p>
      <div className="mt-4 flex justify-center">
        <Button asChild size="sm" className="cursor-pointer rounded-full">
          <Link href="/dashboard/explore">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Mulai dari Jelajahi
          </Link>
        </Button>
      </div>
    </div>
  );
}
