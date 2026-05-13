import Link from "next/link";
import {
  BookOpen,
  Handshake,
  LibraryBig,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { CinematicReadingFlow } from "@/components/ui/cinematic-reading-flow";
import { SplashScreen } from "@/components/ui/splash-screen";

const featureCards = [
  {
    icon: BookOpen,
    title: "Catat buku",
    description: "Kelola status baca dan koleksi fisik dalam satu rak.",
  },
  {
    icon: MessageCircle,
    title: "Tulis review",
    description: "Rating, quote, dan kesan tampil ringkas di feed.",
  },
  {
    icon: Handshake,
    title: "Pinjam buku",
    description: "Lihat buku tersedia dan ajukan request dengan aman.",
  },
] as const;

const trustItems = [
  "Profil membaca yang personal.",
  "Status pinjam yang jelas.",
  "Feed sosial yang tetap tenang.",
] as const;

const statCards = [
  { icon: Star, value: "4.8", label: "rating rata-rata" },
  { icon: Users, value: "18", label: "teman pembaca" },
  { icon: ShieldCheck, value: "6", label: "buku bisa dipinjam" },
] as const;

export default function Page() {
  return (
    <SplashScreen>
      <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">
        <CinematicHero
          brandName="Shelfgram"
          cardDescription="Catat buku, tulis review, dan temukan koleksi fisik pembaca lain."
          cardHeading="Buku. Review. Pinjam."
          ctaDescription="Catat buku dan temukan pembaca lain."
          ctaHeading="Mulai rakmu."
          metricLabel="buku terkurasi"
          metricValue={128}
          splineScene="/3d/opening_book_on_scroll.spline"
          tagline1="Baca."
          tagline2="Review. Pinjam."
        />

        <CinematicReadingFlow />

        <section className="relative border-y border-border/80 bg-card/60 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B6F4E]">
                Intinya
              </p>
              <h2 className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Satu tempat untuk buku, review, dan peminjaman.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Shelfgram dibuat untuk pembaca yang ingin mencatat bacaan dan
              terhubung tanpa feed yang berisik.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_12px_32px_rgba(36,26,18,0.06)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#C98348]/60 hover:shadow-[0_18px_44px_rgba(36,26,18,0.1)]"
                  key={feature.title}
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-[0_20px_70px_rgba(36,26,18,0.1)] sm:p-7">
              <div className="rounded-[1.5rem] bg-[#1F4D3A] p-5 text-[#FFF9F0] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FFF9F0]/60">
                      Reading DNA
                    </p>
                    <h2 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">
                      42% sastra
                    </h2>
                  </div>
                  <LibraryBig
                    aria-hidden="true"
                    className="size-10 text-[#D6B28B]"
                  />
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {statCards.map((stat) => {
                    const StatIcon = stat.icon;

                    return (
                      <div
                        className="rounded-2xl border border-[#FFF9F0]/10 bg-[#FFF9F0]/8 p-4"
                        key={stat.label}
                      >
                        <StatIcon
                          aria-hidden="true"
                          className="size-5 text-[#D6B28B]"
                        />
                        <p className="mt-4 font-heading text-2xl font-semibold">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-xs text-[#FFF9F0]/60">
                          {stat.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8B6F4E]">
                UI consistency
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Cozy, jelas, dan konsisten.
              </h2>
              <ul className="mt-7 grid gap-3">
                {trustItems.map((item) => (
                  <li
                    className="flex gap-3 text-base leading-7 text-muted-foreground"
                    key={item}
                  >
                    <ShieldCheck
                      aria-hidden="true"
                      className="mt-1 size-5 shrink-0 text-[#2F7D4F]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_rgba(31,77,58,0.2)] transition-colors duration-200 hover:bg-primary/85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                href="/register"
              >
                Mulai sekarang
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SplashScreen>
  );
}
