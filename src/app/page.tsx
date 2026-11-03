// Ini untuk landing page
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import { SplashScreen } from "@/components/ui/splash-screen";
import CinematicReadingJourney from "@/features/landing/components/cinematic-reading-journey";
import CinematicBlindMatch from "@/features/landing/components/cinematic-blind-match";
import CinematicBookAiChat from "@/features/landing/components/cinematic-book-ai-chat";
import CinematicFinalCta from "@/features/landing/components/cinematic-final-cta";
import { LandingScrollSmoother } from "@/features/landing/components/landing-scroll-smoother";

export default function Page() {
  return (
    <SplashScreen>
      <main className="min-h-dvh overflow-x-hidden bg-background text-foreground">
        <LandingScrollSmoother>
          <CinematicHero
            brandName="Shelfgram"
            cardDescription="Catat buku, tulis review, ketemu pembaca lain."
            cardHeading="Read. Review. Connect."
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
        </LandingScrollSmoother>
      </main>
    </SplashScreen >
  );
}
