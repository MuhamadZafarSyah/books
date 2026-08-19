"use client";

/**
 * CinematicReadingJourney
 * -----------------------
 * Satu section landing page Shelfgram yang scroll-driven & sinematik.
 *
 * Vibe: cozy, hangat, tenang. Saat user scroll, section ini di-"pin",
 * lalu tiga langkah (Catat → Review → Komunitas) muncul bergiliran
 * dengan parallax kartu buku, counter yang naik, dan progress line.
 *
 * Dependencies (udah ada di project kamu):
 *   - react, react-dom
 *   - gsap (pakai ScrollTrigger)
 *   - tailwindcss
 *
 * Cara pakai:
 *   import CinematicReadingJourney from "@/components/ui/cinematic-reading-journey";
 *   ...
 *   <CinematicReadingJourney />
 *
 * Catatan: komponen ini 'use client' karena GSAP butuh akses DOM.
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Step = {
  id: string;
  index: string;
  title: string;
  headline: string;
  description: string;
  accent: string; // tailwind text color util
  glow: string; // rgba untuk radial glow background
};

const STEPS: Step[] = [
  {
    id: "catat",
    index: "01",
    title: "Catat",
    headline: "Simpan bacaanmu.",
    description:
      "Geser buku ke rak: lagi dibaca, kelar, atau mau dibaca. Rapi tanpa ribet.",
    accent: "text-[#d6b28b]",
    glow: "rgba(245, 158, 11, 0.18)",
  },
  {
    id: "review",
    index: "02",
    title: "Review",
    headline: "Bagikan kesanmu.",
    description:
      "Rating, quote, & catatan tampil rapi di feed. Biar kesanmu kebaca circle.",
    accent: "text-[#c98348]",
    glow: "rgba(244, 114, 182, 0.16)",
  },
  {
    id: "komunitas",
    index: "03",
    title: "Komunitas",
    headline: "Temuin circle-mu.",
    description:
      "Intip profil, review, & circle yang seirama sama ritme bacamu.",
    accent: "text-[#8fb89e]",
    glow: "rgba(52, 211, 153, 0.16)",
  },
];

const SHELF_BOOKS = [
  { title: "Laut Bercerita", spine: "from-[#d6b28b] to-[#8b6f4e]", },
  { title: "Bumi Manusia", spine: "from-[#c98348] to-[#6b3d1d]" },
  { title: "Aroma Karsa", spine: "from-[#8fb89e] to-[#1f4d3a]" },
  { title: "Pulang", spine: "from-[#fff9f0] to-[#d6b28b]" },
  { title: "Cantik Itu Luka", spine: "from-[#bfae9c] to-[#8b6f4e]" },
  { title: "Hujan", spine: "from-[#2f7d4f] to-[#17402c]" },
];


export default function CinematicReadingJourney() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // initial glow color
      gsap.set("[data-anim='glow']", { background: STEPS[0].glow });

      // --- Intro: heading + subtitle reveal ---
      gsap.from("[data-anim='intro']", {
        yPercent: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: root,
          start: "top 75%",
        },
      });

      // --- Books slide onto the shelf with parallax ---
      gsap.from("[data-anim='book']", {
        yPercent: 120,
        rotation: () => gsap.utils.random(-8, 8),
        opacity: 0,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: "[data-anim='shelf']",
          start: "top 80%",
          end: "top 40%",
          scrub: prefersReduced ? false : 1,
        },
      });

      if (prefersReduced || isMobile) {
        // Mobile or reduced motion: no scroll-pinning. Show steps clearly in sequence.
        gsap.set("[data-anim='step']", { opacity: 1, yPercent: 0 });
        gsap.set("[data-anim='progress-fill']", { width: "100%" });
        return;
      }

      // --- Pinned cinematic timeline: steps scrub through (Desktop only) ---
      const steps = gsap.utils.toArray<HTMLElement>("[data-anim='step']");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=" + steps.length * 100 + "%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      steps.forEach((step, i) => {
        const glow = step.dataset.glow;
        const card = step.querySelector("[data-anim='step-card']");

        // masuk
        tl.fromTo(
          step,
          { opacity: 0, yPercent: 12 },
          { opacity: 1, yPercent: 0, ease: "power2.out", duration: 0.6 },
          i === 0 ? 0 : ">-0.15",
        );

        if (card) {
          tl.fromTo(
            card,
            { scale: 0.92, rotateX: 8 },
            { scale: 1, rotateX: 0, ease: "power2.out", duration: 0.6 },
            "<",
          );
        }

        // shift background glow
        if (glow) {
          tl.to(
            "[data-anim='glow']",
            { background: glow, ease: "none", duration: 0.6 },
            "<",
          );
        }

        // progress line
        tl.to(
          "[data-anim='progress-fill']",
          {
            width: ((i + 1) / steps.length) * 100 + "%",
            ease: "none",
            duration: 0.6,
          },
          "<",
        );

        // keluar (kecuali step terakhir biar nahan di akhir)
        if (i < steps.length - 1) {
          tl.to(step, {
            opacity: 0,
            yPercent: -12,
            ease: "power2.in",
            duration: 0.5,
          });
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative w-full overflow-hidden bg-[#0f0d0b] font-sans text-[#fff9f0]"
      aria-label="Perjalanan membaca di Shelfgram"
    >
      {/* Background glow yang shift warna mengikuti step */}
      <div
        data-anim="glow"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full blur-3xl transition-colors"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_60%)]" />

      {/* Intro */}
      <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-8 text-center md:pt-28 md:pb-10">
        <p
          data-anim="intro"
          className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b28b] sm:text-sm"
        >
          Cara kerja Shelfgram
        </p>
        <h2
          data-anim="intro"
          className="text-balance font-heading text-3xl font-semibold leading-tight tracking-tight text-[#fff9f0] sm:text-5xl md:text-6xl"
        >
          Tiga langkah. <span className="text-[#d6b28b]">Satu ruang baca.</span>
        </h2>
        <p
          data-anim="intro"
          className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-7 text-[#fff9f0]/78 sm:text-lg sm:leading-8"
        >
          Fokus ke hal yang kamu lakuin tiap hari—nyatet, ngereview, dan nemu
          temen baca yang sefrekuensi.
        </p>
      </div>

      {/* Shelf dengan buku parallax + counter */}
      <div
        data-anim="shelf"
        className="relative mx-auto mb-8 flex max-w-3xl items-end justify-center gap-2 px-6 sm:gap-3"
      >
        {SHELF_BOOKS.map((book) => (
          <div
            key={book.title}
            data-anim="book"
            title={book.title}
            className={`h-24 w-7 rounded-sm bg-gradient-to-b ${book.spine} shadow-lg shadow-black/40 sm:h-32 sm:w-9`}
          />
        ))}
      </div>
      <div className="mt-1 h-px w-full max-w-md bg-gradient-to-r from-transparent via-[#fff9f0]/10 to-transparent" />

      {/* Pinned / Flow steps */}
      <div
        ref={pinRef}
        className="relative flex min-h-fit py-12 items-center justify-center md:min-h-screen md:py-0 [perspective:1000px]"
      >
        {/* progress bar (desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-10 h-1 w-48 -translate-x-1/2 overflow-hidden rounded-full bg-[#fff9f0]/10">
          <div
            data-anim="progress-fill"
            className="h-full w-0 rounded-full bg-[#d6b28b]"
          />
        </div>

        {/* steps container */}
        <div className="relative flex flex-col gap-6 w-full max-w-2xl px-6 md:grid md:place-items-center md:gap-0">
          {STEPS.map((step) => (
            <div
              key={step.id}
              data-anim="step"
              data-glow={step.glow}
              className="w-full opacity-100 md:col-start-1 md:row-start-1 md:opacity-0"
            >
              <div
                data-anim="step-card"
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-sm sm:p-12"
              >
                <span
                  className={`text-xs font-bold uppercase tracking-[0.22em] ${step.accent}`}
                >
                  {step.index}
                </span>
                <h3 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-[#fff9f0] sm:text-4xl">
                  {step.title}
                </h3>
                <p className="mt-3 font-heading text-xl font-semibold leading-snug text-[#f5ebdd] sm:text-3xl">
                  {step.headline}
                </p>
                <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-6 text-[#fff9f0]/72 sm:text-base sm:leading-7">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
