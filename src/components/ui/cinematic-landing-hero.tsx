"use client";

import React, { useEffect, useRef } from "react";
import {
  BookOpen,
  LibraryBig,
  Star,
  Users,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { SplineScene } from "@/components/spline";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const DEFAULT_SPLINE_SCENE = "/3d/opening_book_on_scroll.spline";

const INJECTED_STYLES = `
  .sg-gsap-reveal { visibility: hidden; }
  .sg-transform-3d { transform-style: preserve-3d; }

  @media (min-width: 768px) {
    .sg-film-grain {
      position: absolute; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 50; opacity: 0.055; mix-blend-mode: multiply;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
    }
  }

  .sg-bg-grid {
    background-size: 64px 64px;
    background-image:
      linear-gradient(to right, color-mix(in srgb, var(--color-foreground) 7%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, var(--color-foreground) 7%, transparent) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 72%);
  }

  .sg-text-3d {
    color: var(--color-foreground);
    text-shadow:
      0 18px 42px color-mix(in srgb, var(--color-foreground) 18%, transparent),
      0 2px 5px color-mix(in srgb, var(--color-foreground) 12%, transparent);
  }

  .sg-text-warm-metal {
    background: linear-gradient(180deg, var(--color-foreground) 0%, color-mix(in srgb, #c98348 55%, var(--color-foreground)) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateZ(0);
    filter:
      drop-shadow(0px 12px 24px color-mix(in srgb, var(--color-foreground) 13%, transparent))
      drop-shadow(0px 3px 6px color-mix(in srgb, var(--color-foreground) 8%, transparent));
  }

  .sg-card-title-metal {
    background: linear-gradient(180deg, #fff9f0 0%, #d6b28b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateZ(0);
    filter: drop-shadow(0px 14px 28px rgba(0,0,0,0.65));
  }

  .sg-premium-card {
    background:
      radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(214,178,139,0.18), transparent 32%),
      linear-gradient(145deg, #1f4d3a 0%, #17120d 100%);
    box-shadow:
      0 42px 110px -24px rgba(36, 26, 18, 0.76),
      0 20px 46px -24px rgba(31, 77, 58, 0.62),
      inset 0 1px 2px rgba(255, 249, 240, 0.2),
      inset 0 -2px 4px rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(255, 249, 240, 0.08);
    position: relative;
  }

  .sg-card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(760px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,249,240,0.09) 0%, transparent 42%);
    mix-blend-mode: screen;
  }

  .sg-spline-stage {
    background:
      radial-gradient(circle at 50% 35%, rgba(255,249,240,0.16), transparent 34%),
      linear-gradient(180deg, rgba(255,249,240,0.08) 0%, rgba(255,249,240,0.025) 100%);
    box-shadow:
      0 28px 70px rgba(0,0,0,0.35),
      inset 0 1px 1px rgba(255,249,240,0.12),
      inset 0 -1px 1px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,249,240,0.07);
  }

  .sg-floating-badge {
    background: linear-gradient(135deg, rgba(7, 21, 15, 0.94) 0%, rgba(31, 77, 58, 0.86) 100%);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    box-shadow:
      0 0 0 1px rgba(255, 249, 240, 0.2),
      0 24px 50px -14px rgba(0, 0, 0, 0.85),
      inset 0 1px 1px rgba(255,249,240,0.18),
      inset 0 -1px 1px rgba(0,0,0,0.55);
  }

  .sg-copy-panel {
    background: linear-gradient(135deg, rgba(7, 21, 15, 0.78) 0%, rgba(31, 77, 58, 0.48) 100%);
    border: 1px solid rgba(255, 249, 240, 0.16);
    box-shadow: 0 22px 54px -28px rgba(0, 0, 0, 0.76), inset 0 1px 1px rgba(255,249,240,0.1);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .sg-btn-light, .sg-btn-dark {
    transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
  }

  .sg-btn-light {
    background: linear-gradient(180deg, #fff9f0 0%, #f1e4d2 100%);
    color: #1f4d3a;
    box-shadow: 0 0 0 1px rgba(31,77,58,0.08), 0 12px 28px -10px rgba(36,26,18,0.35), inset 0 1px 1px rgba(255,255,255,0.8);
  }

  .sg-btn-light:hover { transform: translateY(-2px); box-shadow: 0 16px 34px -12px rgba(36,26,18,0.42), inset 0 1px 1px rgba(255,255,255,0.9); }
  .sg-btn-light:active { transform: translateY(1px); }

  .sg-btn-dark {
    background: linear-gradient(180deg, #1f4d3a 0%, #173b2c 100%);
    color: #fff9f0;
    box-shadow: 0 0 0 1px rgba(255,249,240,0.08), 0 14px 30px -10px rgba(31,77,58,0.55), inset 0 1px 1px rgba(255,255,255,0.13);
  }

  .sg-btn-dark:hover { transform: translateY(-2px); background: linear-gradient(180deg, #2f7d4f 0%, #1f4d3a 100%); }
  .sg-btn-dark:active { transform: translateY(1px); }
`;

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  tagline1?: string;
  tagline2?: string;
  cardHeading?: string;
  cardDescription?: React.ReactNode;
  metricValue?: number;
  metricLabel?: string;
  ctaHeading?: string;
  ctaDescription?: string;
  splineScene?: string;
}

export function CinematicHero({
  brandName = "Shelfgram",
  tagline1 = "Baca.",
  tagline2 = "Review. Nyambung.",
  cardHeading = "Read. Review. Connect.",
  cardDescription = (
    <>Log books, share reviews, and find your reading community.</>
  ),
  metricValue = 128,
  metricLabel = "books chosen",
  ctaHeading = "Start your reading journey.",
  ctaDescription = "Log your books, find your circle, and read together.",
  splineScene = DEFAULT_SPLINE_SCENE,
  className,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const splineWrapRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) return; // Skip mousemove parallax on mobile
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 2.2) return;

      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        const mainCard = mainCardRef.current;
        const splineWrap = splineWrapRef.current;
        if (!mainCard || !splineWrap) return;

        const rect = mainCard.getBoundingClientRect();
        mainCard.style.setProperty(
          "--mouse-x",
          `${event.clientX - rect.left}px`,
        );
        mainCard.style.setProperty(
          "--mouse-y",
          `${event.clientY - rect.top}px`,
        );

        const xVal = (event.clientX / window.innerWidth - 0.5) * 2;
        const yVal = (event.clientY / window.innerHeight - 0.5) * 2;

        gsap.to(splineWrap, {
          rotationY: xVal * 8,
          rotationX: -yVal * 7,
          ease: "power3.out",
          duration: 1,
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const container = containerRef.current;
    if (!container) return;

    const isMobileViewport = window.innerWidth < 768;

    if (reduced || isMobileViewport) {
      // Mobile / Reduced Motion: skip scroll-pinning, immediately show elements
      gsap.set(".sg-gsap-reveal", {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      });
      gsap.set(".sg-main-card", { y: 0, autoAlpha: 1 });
      gsap.set(
        [
          ".sg-card-left",
          ".sg-card-right",
          ".sg-spline-wrapper",
          ".sg-floating-badge",
        ],
        { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, rotationY: 0 },
      );
      gsap.set(".sg-cta-wrapper", {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px)",
      });
      return;
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let onSplashDone: (() => void) | undefined;

    const ctx = gsap.context(() => {
      gsap.set(".sg-text-track", {
        autoAlpha: 0,
        y: 54,
        scale: 0.88,
        filter: "blur(18px)",
        rotationX: -18,
      });
      gsap.set(".sg-text-days", {
        autoAlpha: 1,
        clipPath: "inset(0 100% 0 0)",
      });
      gsap.set(".sg-main-card", { y: window.innerHeight + 160, autoAlpha: 1 });
      gsap.set(
        [
          ".sg-card-left",
          ".sg-card-right",
          ".sg-spline-wrapper",
          ".sg-floating-badge",
          ".sg-mini-card",
        ],
        { autoAlpha: 0 },
      );
      gsap.set(".sg-cta-wrapper", {
        autoAlpha: 0,
        scale: 0.82,
        filter: "blur(26px)",
      });

      // Intro timeline: paused until splash screen completes
      const introTl = gsap.timeline({ paused: true });
      introTl
        .to(".sg-text-track", {
          duration: 1.45,
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          rotationX: 0,
          ease: "expo.out",
        })
        .to(
          ".sg-text-days",
          { duration: 1.25, clipPath: "inset(0 0% 0 0)", ease: "power4.inOut" },
          "-=0.85",
        );

      onSplashDone = () => {
        setTimeout(() => introTl.play(), 300);
      };
      window.addEventListener("shelfgram:splash-done", onSplashDone, {
        once: true,
      });
      fallbackTimer = setTimeout(() => {
        if (!introTl.isActive() && introTl.progress() === 0) {
          introTl.play();
        }
      }, 4000);

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=5600",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      scrollTl
        .to(
          [".sg-hero-text-wrapper", ".sg-bg-grid"],
          {
            scale: 1.13,
            filter: "blur(18px)",
            opacity: 0.2,
            ease: "power2.inOut",
            duration: 2,
          },
          0,
        )
        .to(".sg-main-card", { y: 0, ease: "power3.inOut", duration: 2 }, 0)
        .to(".sg-main-card", {
          width: "100%",
          height: "100%",
          borderRadius: "0px",
          ease: "power3.inOut",
          duration: 1.4,
        })
        .fromTo(
          ".sg-spline-wrapper",
          {
            y: 240,
            z: -420,
            rotationX: 44,
            rotationY: -24,
            autoAlpha: 0,
            scale: 0.72,
          },
          {
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            autoAlpha: 1,
            scale: 1,
            ease: "expo.out",
            duration: 2.3,
          },
          "-=0.6",
        )
        .fromTo(
          ".sg-mini-card",
          { y: 30, autoAlpha: 0, scale: 0.95 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            stagger: 0.12,
            ease: "back.out(1.2)",
            duration: 1.25,
          },
          "-=1.4",
        )
        .to(
          ".sg-counter-val",
          {
            innerHTML: metricValue,
            snap: { innerHTML: 1 },
            duration: 1.6,
            ease: "expo.out",
          },
          "-=1.3",
        )
        .fromTo(
          ".sg-floating-badge",
          { y: 90, autoAlpha: 0, scale: 0.76, rotationZ: -8 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            rotationZ: 0,
            ease: "back.out(1.5)",
            duration: 1.4,
            stagger: 0.18,
          },
          "-=1.6",
        )
        .fromTo(
          ".sg-card-left",
          { x: -46, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, ease: "power4.out", duration: 1.3 },
          "-=1.2",
        )
        .fromTo(
          ".sg-card-right",
          { x: 46, autoAlpha: 0, scale: 0.86 },
          { x: 0, autoAlpha: 1, scale: 1, ease: "expo.out", duration: 1.3 },
          "<",
        )
        .to({}, { duration: 1.8 })
        .set(".sg-hero-text-wrapper", { autoAlpha: 0 })
        .set(".sg-cta-wrapper", { autoAlpha: 1 })
        .to({}, { duration: 0.9 })
        .to(
          [
            ".sg-spline-wrapper",
            ".sg-floating-badge",
            ".sg-card-left",
            ".sg-card-right",
            ".sg-mini-card",
          ],
          {
            scale: 0.9,
            y: -34,
            z: -180,
            autoAlpha: 0,
            ease: "power3.in",
            duration: 1.1,
            stagger: 0.04,
          },
        )
        .to(
          ".sg-main-card",
          {
            width: "86vw",
            height: "84vh",
            borderRadius: "40px",
            ease: "expo.inOut",
            duration: 1.65,
          },
          "sg-pullback",
        )
        .to(
          ".sg-cta-wrapper",
          { scale: 1, filter: "blur(0px)", ease: "expo.inOut", duration: 1.65 },
          "sg-pullback",
        )
        .to(".sg-main-card", {
          y: -window.innerHeight - 220,
          ease: "power3.in",
          duration: 1.35,
        });
    }, container);

    return () => {
      if (onSplashDone) {
        window.removeEventListener("shelfgram:splash-done", onSplashDone);
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      ctx.revert();
    };
  }, [metricValue]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden bg-background font-sans text-foreground antialiased",
        isMobile ? "min-h-screen flex-col py-12" : "h-screen",
        className,
      )}
      style={{ perspective: isMobile ? "none" : "1500px" }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      {!isMobile && <div aria-hidden="true" className="sg-film-grain" />}
      <div
        aria-hidden="true"
        className="sg-bg-grid absolute inset-0 z-0 pointer-events-none opacity-60"
      />

      {isMobile ? (
        /* ================= MOBILE LAYOUT (SIMPLE MINIMALIST) ================= */
        <div className="z-10 flex w-full max-w-md flex-col items-center justify-center px-6 text-center py-6">
          {/* Brand Tagline Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/85 shadow-sm backdrop-blur-sm">
            <LibraryBig aria-hidden="true" className="size-3.5 text-primary" />
            Shelfgram · Ruang Baca Sosial
          </div>

          {/* Main Editorial Headline */}
          <h1 className="sg-text-warm-metal font-heading text-4xl font-extrabold tracking-tight leading-tight">
            {cardHeading}
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {ctaDescription}
          </p>



          {/* Simple CTA Buttons */}
          <div className="flex mt-12 w-full flex-col gap-3 max-w-xs">
            <a
              aria-label="Daftar Shelfgram"
              className="sg-btn-dark inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold shadow-md"
              href="/auth/register"
            >
              <BookOpen aria-hidden="true" className="size-4" />
              Mulai rak bacaku
            </a>
            <a
              aria-label="Masuk ke Shelfgram"
              className="sg-btn-light inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-bold"
              href="/auth/login"
            >
              <Users aria-hidden="true" className="size-4" />
              Gabung komunitas
            </a>
          </div>
        </div>
      ) : (
        /* ================= DESKTOP LAYOUT (EXACT ORIGINAL) ================= */
        <>
          <div className="sg-hero-text-wrapper sg-transform-3d absolute z-10 flex w-full flex-col items-center justify-center px-4 text-center will-change-transform">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur sm:text-sm">
              <LibraryBig aria-hidden="true" className="size-4 text-primary" />
              Ruang baca sosial yang bikin betah.
            </p>
            <h1 className="sg-text-track sg-gsap-reveal sg-text-3d mb-2 max-w-5xl font-heading text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl lg:text-[6.5rem]">
              {tagline1}
            </h1>
            <h1 className="sg-text-days sg-gsap-reveal sg-text-warm-metal max-w-6xl font-heading text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-[6.5rem]">
              {tagline2}
            </h1>
          </div>

          <div className="sg-cta-wrapper sg-gsap-reveal absolute z-10 flex w-full flex-col items-center justify-center px-4 text-center will-change-transform">
            <h2 className="sg-text-warm-metal mb-5 max-w-4xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {ctaHeading}
            </h2>
            <p className="mx-auto mb-9 max-w-2xl text-base font-normal leading-7 text-muted-foreground sm:text-lg md:text-xl md:leading-8">
              {ctaDescription}
            </p>
            <div className="flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
              <a
                aria-label="Daftar Shelfgram"
                className="sg-btn-dark inline-flex min-h-12 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-base"
                href="/auth/register"
              >
                <BookOpen aria-hidden="true" className="size-5" />
                Mulai rak bacaku
              </a>
              <a
                aria-label="Masuk ke Shelfgram"
                className="sg-btn-light inline-flex min-h-12 items-center justify-center gap-3 rounded-[1.25rem] px-7 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-base"
                href="/auth/login"
              >
                <Users aria-hidden="true" className="size-5" />
                Gabung komunitas
              </a>
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            style={{ perspective: "1500px" }}
          >
            <div
              ref={mainCardRef}
              className="sg-main-card sg-premium-card sg-gsap-reveal pointer-events-auto relative flex h-[88vh] w-[92vw] items-center justify-center overflow-hidden rounded-[28px] md:h-[84vh] md:w-[86vw] md:rounded-[40px]"
            >
              <div aria-hidden="true" className="sg-card-sheen" />

              <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-rows-[auto_1fr_auto] items-center gap-4 px-4 py-5 sm:px-6 md:gap-6 lg:grid-cols-[0.8fr_1.45fr_0.75fr] lg:grid-rows-1 lg:gap-8 lg:px-10 lg:py-0 xl:px-12">
                <div className="sg-card-right sg-gsap-reveal order-1 flex w-full justify-center lg:order-3 lg:justify-end">
                  <h2 className="sg-card-title-metal fixed z-50! font-heading text-4xl font-black uppercase tracking-[-0.08em] sm:text-6xl md:text-7xl lg:text-[6.5rem] xl:text-[8rem]">
                    {brandName}
                  </h2>
                </div>

                <div
                  className="sg-spline-wrapper sg-gsap-reveal order-2 relative flex h-[min(54vh,31rem)] w-full items-center justify-center sm:h-[min(58vh,36rem)] lg:order-2 lg:h-[min(72vh,42rem)]"
                  style={{ perspective: "1200px" }}
                >
                  <div
                    ref={splineWrapRef}
                    className="sg-spline-stage sg-transform-3d relative h-full w-full max-w-[42rem] overflow-hidden rounded-[2rem] will-change-transform sm:rounded-[2.5rem]"
                  >
                    <SplineScene
                      className="h-full min-h-[24rem] w-full sm:min-h-[32rem]"
                      scene={splineScene}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#17120d]/55 to-transparent" />
                  </div>

                  <div className="sg-floating-badge absolute left-1 top-3 z-30 flex max-w-[13rem] items-center gap-3 rounded-2xl p-3 sm:left-4 sm:top-8 sm:max-w-[16rem] sm:p-4 lg:-left-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#d6b28b]/30 bg-[#d6b28b]/15 text-[#d6b28b]">
                      <Star aria-hidden="true" className="size-5 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#fff9f0] sm:text-sm">
                        Review kesimpen
                      </p>
                      <p className="text-[10px] font-medium text-[#fff9f0]/82 sm:text-xs">
                        Rating &amp; kesanmu.
                      </p>
                    </div>
                  </div>

                  <div className="sg-floating-badge absolute right-1 bottom-4 z-30 flex max-w-[13rem] items-center gap-3 rounded-2xl p-3 sm:right-4 sm:bottom-8 sm:max-w-[16rem] sm:p-4 lg:-right-6">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#8fb89e]/30 bg-[#8fb89e]/15 text-[#8fb89e]">
                      <Users aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#fff9f0] sm:text-sm">
                        Temen baca aktif
                      </p>
                      <p className="text-[10px] font-medium text-[#fff9f0]/82 sm:text-xs">
                        Profil &amp; review.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sg-card-left sg-copy-panel sg-gsap-reveal order-3 flex w-full flex-col justify-center rounded-[1.5rem] px-4 py-4 text-center lg:order-1 lg:px-5 lg:py-5 lg:text-left">
                  <h3 className="mb-3 font-heading text-2xl font-semibold tracking-tight text-[#fff9f0] sm:text-3xl lg:text-4xl">
                    {cardHeading}
                  </h3>
                  <p className="mx-auto hidden max-w-sm text-sm leading-7 text-[#fff9f0]/90 md:block lg:mx-0 lg:max-w-none lg:text-base">
                    {cardDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
