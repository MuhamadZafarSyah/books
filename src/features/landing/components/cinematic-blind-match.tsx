"use client";

/**
 * CinematicBlindMatch
 * -------------------
 * Section sinematik scroll-driven buat fitur "Blind Match" Shelfgram.
 *
 * Konsep: profil teman baca awalnya disamarkan (blur + nama disensor),
 * lalu kebuka bertahap saat user scroll — match ring naik 0 -> 92%,
 * genre & quote muncul bergiliran, avatar makin jelas, dan diakhiri
 * badge "It's a match". Vibe cozy, hangat, penuh anticipation.
 *
 * Dependencies (udah ada di project kamu):
 *   - react, react-dom
 *   - gsap (pakai ScrollTrigger)
 *   - tailwindcss
 *
 * Cara pakai:
 *   import CinematicBlindMatch from "@/components/ui/cinematic-blind-match";
 *   <CinematicBlindMatch />
 */

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const GENRES = ["Sastra", "Fiksi spekulatif", "Self-help", "Puisi"];

const REVEAL_ROWS = [
  {
    label: "Ritme baca",
    value: "3 buku / bulan · tim baca malem",
  },
  {
    label: "Quote favorit",
    value: "“Kita tidak pernah benar-benar pulang, kita cuma singgah.”",
  },
  {
    label: "Lagi dibaca",
    value: "Laut Bercerita · Leila S. Chudori",
  },
];

const PARTICLES = [
  "01",
  "&",
  "02",
  "—",
  "03",
  "\u201c",
];

const RING_RADIUS = 54;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;
const MATCH = 92;

export default function CinematicBlindMatch() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const matchNumRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const setRing = (pct: number) => {
      if (ringRef.current)
        gsap.set(ringRef.current, {
          strokeDashoffset: RING_CIRC * (1 - pct / 100),
        });
      if (matchNumRef.current)
        matchNumRef.current.textContent = Math.round(pct).toString();
    };

    const ctx = gsap.context(() => {
      // initial states
      gsap.set("[data-anim='avatar']", { filter: "blur(22px)" });
      if (ringRef.current)
        gsap.set(ringRef.current, {
          strokeDasharray: RING_CIRC,
          strokeDashoffset: RING_CIRC,
        });

      // intro reveal
      gsap.from("[data-anim='intro']", {
        yPercent: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root, start: "top 75%" },
      });

      // floating particles parallax
      gsap.to("[data-anim='particle']", {
        yPercent: (i: number) => -30 - i * 12,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      if (prefersReduced) {
        gsap.set("[data-anim='avatar']", { filter: "blur(0px)" });
        gsap.set("[data-anim='reveal']", { opacity: 1, yPercent: 0 });
        gsap.set("[data-anim='name']", { opacity: 1, filter: "blur(0px)" });
        gsap.set("[data-anim='match-badge']", { opacity: 1, scale: 1 });
        setRing(MATCH);
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=320%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // 1. avatar mulai kebuka + match ring naik + counter
      tl.to(
        "[data-anim='avatar']",
        { filter: "blur(8px)", duration: 0.8, ease: "power2.out" },
        0,
      );
      const ringObj = { v: 0 };
      tl.to(
        ringObj,
        {
          v: MATCH,
          duration: 1.4,
          ease: "power1.out",
          onUpdate: () => setRing(ringObj.v),
        },
        0,
      );

      // 2. baris info kebuka bergiliran
      tl.from(
        "[data-anim='reveal']",
        {
          opacity: 0,
          yPercent: 35,
          filter: "blur(6px)",
          stagger: 0.3,
          ease: "power2.out",
          duration: 0.8,
        },
        0.4,
      );

      // 3. avatar full clear + nama kebuka
      tl.to(
        "[data-anim='avatar']",
        { filter: "blur(0px)", duration: 0.8, ease: "power2.out" },
        ">-0.2",
      );
      tl.from(
        "[data-anim='name']",
        {
          opacity: 0,
          filter: "blur(12px)",
          yPercent: 20,
          duration: 0.6,
          ease: "power2.out",
        },
        "<",
      );

      // 4. badge "match" pop
      tl.from(
        "[data-anim='match-badge']",
        { opacity: 0, scale: 0.4, ease: "back.out(2)", duration: 0.6 },
        ">-0.1",
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative w-full overflow-hidden bg-[#0f0d0b] font-sans text-[#fff9f0]"
      aria-label="Blind Match di Shelfgram"
    >
      {/* glow + particles */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(214,178,139,0.18),_transparent_60%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            data-anim="particle"
            className={`absolute font-heading text-2xl font-semibold text-[#d6b28b] opacity-20 sm:text-3xl ${[
              "left-[8%] top-[20%]",
              "left-[85%] top-[15%]",
              "left-[15%] top-[70%]",
              "left-[78%] top-[68%]",
              "left-[45%] top-[10%]",
              "left-[55%] top-[82%]",
            ][i]
              }`}
          >
            {p}
          </span>
        ))}
      </div>

      {/* Intro */}
      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-12 text-center">
        <p
          data-anim="intro"
          className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#d6b28b]"
        >
          Blind Match
        </p>
        <h2
          data-anim="intro"
          className="text-balance font-heading text-4xl font-semibold leading-tight tracking-tight text-[#fff9f0] sm:text-5xl md:text-6xl"
        >
          Kenalan pelan-pelan,{" "}
          <span className="text-[#d6b28b]">biar pas di hati.</span>
        </h2>
        <p
          data-anim="intro"
          className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-[#fff9f0]/78 sm:text-lg sm:leading-8"
        >
          Profil teman baca kebuka bertahap—mulai dari selera bacanya, bukan
          fotonya. Scroll buat lihat siapa yang sefrekuensi sama kamu.
        </p>
      </div>

      {/* Pinned stage */}
      <div
        ref={pinRef}
        className="relative flex min-h-screen items-center justify-center px-6"
      >
        <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-md">
          {/* avatar + match ring */}
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 h-full w-full -rotate-90"
            >
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
              />
              <circle
                ref={ringRef}
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke="url(#matchGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC}
              />
              <defs>
                <linearGradient id="matchGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d6b28b" />
                  <stop offset="100%" stopColor="#c98348" />
                </linearGradient>
              </defs>
            </svg>
            <div
              data-anim="avatar"
              className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#d6b28b] via-[#c98348] to-[#1f4d3a] font-heading text-3xl font-semibold text-[#17120d] blur-[22px]"
            >
              S
            </div>
          </div>

          {/* match percentage */}
          <p className="mt-5 text-center text-sm leading-6 text-[#fff9f0]/65">
            <span className="font-heading text-2xl font-semibold text-[#d6b28b]">
              <span ref={matchNumRef}>0</span>%
            </span>{" "}
            cocok sama ritme bacamu
          </p>

          {/* name (disensor -> kebuka) */}
          <div className="mt-2 text-center">
            <span
              data-anim="name"
              className="font-heading text-xl font-semibold tracking-tight text-[#fff9f0]"
            >
              Zafar, 19 · Jakarta
            </span>
          </div>

          {/* genre tags */}
          <div
            data-anim="reveal"
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            {GENRES.map((g) => (
              <span
                key={g}
                className="rounded-full border border-[#d6b28b]/20 bg-[#d6b28b]/10 px-3 py-1 text-xs font-medium leading-5 text-[#f5ebdd]"
              >
                {g}
              </span>
            ))}
          </div>

          {/* info rows */}
          <div className="mt-6 space-y-4">
            {REVEAL_ROWS.map((row) => (
              <div
                key={row.label}
                data-anim="reveal"
                className="border-t border-white/5 pt-3"
              >
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bfae9c]">
                  {row.label}
                </p>
                <p className="mt-1 text-pretty text-sm leading-6 text-[#fff9f0]/78">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          {/* match badge + CTA */}
          <div
            data-anim="match-badge"
            className="mt-7 flex flex-col items-center gap-3"
          >
            <span className="rounded-full bg-gradient-to-r from-[#d6b28b] to-[#c98348] px-4 py-1.5 text-sm font-bold text-[#17120d]">
              It’s a match baca!
            </span>
            <button className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-[#fff9f0] transition-colors hover:bg-white/10">
              Sapa duluan
            </button>
          </div>
        </div>

        {/* <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.22em] text-[#bfae9c]">
          Scroll buat buka profil
        </p> */}
      </div>
    </section>
  );
}
