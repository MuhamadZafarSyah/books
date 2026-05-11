"use client";

import { useEffect, useRef } from "react";

/**
 * A 3D book that rotates open as the user scrolls the parent section into view.
 * Uses a single scroll listener + rAF with prefers-reduced-motion guard.
 */
export function ScrollRevealBook() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const container = containerRef.current;
    const book = bookRef.current;
    const cover = coverRef.current;
    const page = pageRef.current;
    if (!container || !book || !cover || !page) return;

    let raf = 0;
    let progress = 0;
    let target = 0;

    const compute = () => {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section first enters the viewport, 1 when it fully passed centre
      const raw = 1 - (rect.top + rect.height / 2) / (vh + rect.height / 2);
      target = Math.max(0, Math.min(1, raw));
    };

    const tick = () => {
      progress += (target - progress) * 0.1;
      const openDeg = -150 * progress; // rotate cover from 0 to -150 deg
      const lift = progress * 8; // slight lift
      const tilt = 14 - progress * 6;
      book.style.transform = `rotateX(${tilt}deg) rotateY(-24deg) translateY(${-lift}px)`;
      cover.style.transform = `rotateY(${openDeg}deg)`;
      page.style.opacity = `${progress}`;
      page.style.transform = `rotateY(${Math.min(openDeg + 150, 0) * 0.4}deg)`;
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => compute();

    compute();
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center"
      style={{ perspective: "1400px" }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute bottom-[18%] left-1/2 h-8 w-[58%] -translate-x-1/2 rounded-full bg-black/25 blur-2xl dark:bg-black/50"
      />

      <div
        ref={bookRef}
        className="relative will-change-transform"
        style={{
          width: 220,
          height: 280,
          transformStyle: "preserve-3d",
          transform: "rotateX(14deg) rotateY(-24deg)",
        }}
      >
        {/* Base / inside of book (pages on left + right) */}
        <div
          className="absolute inset-0 rounded-[8px]"
          style={{
            background:
              "linear-gradient(to bottom, #FFF9F0 0%, #F1E4D2 100%)",
            transform: "translateZ(0)",
            boxShadow: "inset 0 0 30px rgba(36,26,18,0.12)",
          }}
        >
          {/* Right page text lines */}
          <div className="absolute top-6 right-5 left-[54%] space-y-2">
            <div className="h-2 rounded bg-[#E0D1BD]" />
            <div className="h-2 rounded bg-[#E0D1BD]" />
            <div className="h-2 w-4/5 rounded bg-[#E0D1BD]" />
            <div className="h-2 rounded bg-[#E0D1BD]" />
            <div className="h-2 w-3/5 rounded bg-[#E0D1BD]" />
          </div>
          {/* Spine fold */}
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#8B6F4E]/50" />
        </div>

        {/* Flipping page (inner white page that reveals on open) */}
        <div
          ref={pageRef}
          className="absolute inset-0 origin-left rounded-[8px] will-change-transform"
          style={{
            background:
              "linear-gradient(120deg, #FFF9F0 0%, #F1E4D2 100%)",
            transformStyle: "preserve-3d",
            transform: "rotateY(0deg)",
            transformOrigin: "left center",
            boxShadow: "0 0 18px rgba(36,26,18,0.12)",
            opacity: 0,
          }}
        >
          <div className="absolute inset-6 space-y-2">
            <div className="h-2 w-1/2 rounded bg-[#E0D1BD]" />
            <div className="h-2 rounded bg-[#E0D1BD]" />
            <div className="h-2 w-4/5 rounded bg-[#E0D1BD]" />
          </div>
        </div>

        {/* Cover that rotates open */}
        <div
          ref={coverRef}
          className="absolute inset-0 origin-left rounded-[8px] border border-black/10 will-change-transform"
          style={{
            background:
              "linear-gradient(135deg, #1F4D3A 0%, #2F7D4F 50%, #17402C 100%)",
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            transform: "rotateY(0deg)",
            boxShadow: "0 12px 40px rgba(36,26,18,0.3)",
          }}
        >
          <div className="absolute inset-2 rounded-[6px] border border-white/15" />
          <div
            className="absolute inset-x-5 top-8 font-serif text-base leading-tight font-semibold text-[#FFF9F0]"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            Shelfgram
            <div className="mt-2 text-[10px] font-medium tracking-[0.3em] text-[#FFF9F0]/70 uppercase">
              Social Reading
            </div>
          </div>
          <div className="absolute inset-x-5 bottom-6 h-px bg-white/40" />
          <div className="absolute inset-x-5 bottom-3 text-[10px] font-medium tracking-[0.24em] text-[#FFF9F0]/75 uppercase">
            Edisi 001
          </div>
        </div>
      </div>
    </div>
  );
}
