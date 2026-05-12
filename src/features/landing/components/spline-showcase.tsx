"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Sparkles } from "lucide-react";

import { SplineScene } from "@/components/spline";

const SPLINE_SCENE = "/3d/opening_book_on_scroll.spline";

export function SplineShowcase() {
  const shellRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const topCardRef = useRef<HTMLDivElement>(null);
  const bottomCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const shell = shellRef.current;
    const scene = sceneRef.current;
    const topCard = topCardRef.current;
    const bottomCard = bottomCardRef.current;
    if (!shell || !scene) return;

    let target = 0;
    let current = 0;
    let raf = 0;

    const compute = () => {
      const rect = shell.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const midpoint = rect.top + rect.height / 2;
      target = (midpoint - viewport / 2) / viewport;
      target = Math.max(-1, Math.min(1, target));
    };

    const tick = () => {
      current += (target - current) * 0.08;
      const float = Math.sin(performance.now() / 1600) * 5;
      scene.style.transform = `translate3d(0, ${current * -36 + float}px, 0) rotate(${current * 2.5}deg) scale(${1 + Math.abs(current) * 0.035})`;

      if (topCard) {
        topCard.style.transform = `translate3d(${current * 18}px, ${current * -22}px, 0)`;
      }
      if (bottomCard) {
        bottomCard.style.transform = `translate3d(${current * -20}px, ${current * 28}px, 0)`;
      }

      raf = requestAnimationFrame(tick);
    };

    compute();
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className="relative mx-auto min-h-[31rem] w-full max-w-[42rem] overflow-visible sm:min-h-[38rem] lg:min-h-[43rem] lg:max-w-none"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-3 top-10 bottom-8 rounded-[2.5rem] bg-[#1F4D3A]/10 blur-3xl dark:bg-primary/10"
      />
      <div className="absolute inset-x-0 top-5 bottom-5 rounded-[2rem] border border-border/80 bg-card/55 shadow-[0_30px_90px_rgba(36,26,18,0.16)] backdrop-blur-md sm:rounded-[2.75rem]" />

      <div
        ref={sceneRef}
        className="absolute inset-x-[-1rem] top-0 bottom-0 z-10 will-change-transform sm:inset-x-[-2rem] lg:inset-x-[-4rem]"
      >
        <SplineScene
          className="h-full min-h-[31rem] w-full sm:min-h-[38rem] lg:min-h-[43rem]"
          scene={SPLINE_SCENE}
        />
      </div>

      <div
        ref={topCardRef}
        className="absolute top-5 left-2 z-20 max-w-[14rem] rounded-2xl border border-border bg-card/90 p-3 shadow-[0_14px_40px_rgba(36,26,18,0.13)] backdrop-blur-md will-change-transform sm:top-10 sm:left-5 sm:max-w-[16rem] sm:p-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-primary sm:text-sm">
          <Sparkles aria-hidden="true" className="size-4 text-[#C98348]" />
          3D reading shelf
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
          Buku, review, dan rak personal tampil sebagai pengalaman yang terasa hidup.
        </p>
      </div>

      <div
        ref={bottomCardRef}
        className="absolute right-2 bottom-7 z-20 max-w-[15rem] rounded-2xl border border-[#FFF9F0]/20 bg-[#1F4D3A]/92 p-3 text-[#FFF9F0] shadow-[0_18px_50px_rgba(31,77,58,0.24)] backdrop-blur-md will-change-transform sm:right-6 sm:bottom-12 sm:max-w-[17rem] sm:p-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
          <BookOpen aria-hidden="true" className="size-4 text-[#D6B28B]" />
          Scroll untuk melihat gerak
        </div>
        <p className="mt-2 text-xs leading-5 text-[#FFF9F0]/75 sm:text-sm sm:leading-6">
          Scene bergerak lembut mengikuti posisi scroll, tetap nyaman untuk pembaca.
        </p>
      </div>
    </div>
  );
}
