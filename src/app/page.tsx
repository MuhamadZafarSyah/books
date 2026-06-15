import Link from "next/link";
import {
  BookOpen,
  LibraryBig,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { CinematicReadingFlow } from "@/components/ui/cinematic-reading-flow";
import { SplashScreen } from "@/components/ui/splash-screen";
import CinematicReadingJourney from "@/features/landing/components/cinematic-reading-journey";
import CinematicBlindMatch from "@/features/landing/components/cinematic-blind-match";
import CinematicBookAiChat from "@/features/landing/components/cinematic-book-ai-chat";
import CinematicFinalCta from "@/features/landing/components/cinematic-final-cta";
import { LandingScrollSmoother } from "@/features/landing/components/landing-scroll-smoother";

const featureCards = [
  {
    icon: BookOpen,
    title: "Catat buku",
    description: "Atur status baca & koleksi fisikmu dalam satu rak.",
  },
  {
    icon: MessageCircle,
    title: "Tulis review",
    description: "Rating, quote, & kesan tampil rapi di feed.",
  },
  {
    icon: Users,
    title: "Temuin pembaca",
    description: "Intip profil pembaca lain, mulai obrolan dari buku yang sama.",
  },
] as const;

const trustItems = [
  "Profil baca yang personal.",
  "Koneksi antar pembaca yang jelas.",
  "Feed sosial yang tetep adem.",
] as const;

const statCards = [
  { icon: Star, value: "4.8", label: "rating rata-rata" },
  { icon: Users, value: "18", label: "teman pembaca" },
  { icon: LibraryBig, value: "128", label: "buku tercatat" },
] as const;

export default function Page() {
  return (
    <SplashScreen>
      <LandingScrollSmoother>
        <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">
          <CinematicHero
            brandName="Shelfgram"
            cardDescription="Catat buku, tulis review, ketemu pembaca lain."
            cardHeading="Buku. Review. Temen baca."
            ctaDescription="Catat bacaanmu, temuin circle yang seru."
            ctaHeading="Bikin rak bacamu."
            metricLabel="buku pilihan"
            metricValue={128}
            splineScene="/3d/opening_book_on_scroll.spline"
            tagline1="Read."
            tagline2="Review. Connect."
          />

          {/* <CinematicStorytelling /> */}

          {/* <CinematicReadingFlow /> */}
          <CinematicReadingJourney />
          <CinematicBookAiChat />
          <CinematicBlindMatch />
          <CinematicFinalCta />
        </main>
      </LandingScrollSmoother>
    </SplashScreen>
  );
}
