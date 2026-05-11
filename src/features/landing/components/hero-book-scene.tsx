"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type BookFacesProps = {
  /** Width in px */
  w: number;
  /** Height in px */
  h: number;
  /** Depth (spine thickness) in px */
  d: number;
  /** Cover gradient (primary colour). */
  cover: string;
  /** Title printed on the cover & spine. */
  title: string;
  /** Sub-line under the title. */
  author?: string;
  /** Accent colour for the spine band. */
  accent?: string;
  /** Optional extra classes on the book container. */
  className?: string;
  /** Optional inline style on the container (used for translate3d positioning). */
  style?: CSSProperties;
};

/**
 * A pure-CSS 3D book made from 6 faces, using `transform-style: preserve-3d`
 * and translateZ on each face. No dependencies, hardware-accelerated.
 */
function Book3D({
  w,
  h,
  d,
  cover,
  title,
  author,
  accent = "#C98348",
  className,
  style,
}: BookFacesProps) {
  const half = d / 2;

  return (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        transformStyle: "preserve-3d",
        position: "absolute",
        ...style,
      }}
    >
      {/* Front cover */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[10px] border border-white/10 shadow-[inset_0_0_60px_rgba(0,0,0,0.25)]"
        style={{
          background: cover,
          transform: `translateZ(${half}px)`,
          backfaceVisibility: "hidden",
        }}
      >
        <div className="absolute inset-2 rounded-[7px] border border-white/15" />
        <div className="absolute inset-x-5 top-6 h-px bg-white/40" />
        <div
          className="absolute inset-x-5 top-8 font-serif text-[15px] leading-tight font-semibold tracking-tight text-[#FFF9F0]"
          style={{ fontFamily: "var(--font-heading), serif" }}
        >
          {title}
        </div>
        {author ? (
          <div className="absolute inset-x-5 bottom-6 text-[10px] font-medium tracking-[0.28em] text-[#FFF9F0]/70 uppercase">
            {author}
          </div>
        ) : null}
        <div className="absolute inset-x-5 bottom-4 h-px bg-white/30" />
      </div>

      {/* Back cover */}
      <div
        className="absolute inset-0 rounded-[10px] border border-black/10"
        style={{
          background: cover,
          filter: "brightness(0.72) saturate(0.9)",
          transform: `translateZ(-${half}px) rotateY(180deg)`,
          backfaceVisibility: "hidden",
        }}
      />

      {/* Spine (left) */}
      <div
        className="absolute top-0 left-0 overflow-hidden rounded-l-[6px] border-y border-l border-black/20"
        style={{
          width: d,
          height: h,
          background: cover,
          filter: "brightness(0.88)",
          transformOrigin: "left center",
          transform: `rotateY(-90deg) translateX(-${half}px)`,
        }}
      >
        <div
          className="absolute inset-y-4 left-1/2 w-[2px] -translate-x-1/2"
          style={{ background: accent }}
        />
        <div
          className="absolute inset-x-0 top-6 text-center text-[8px] font-semibold tracking-[0.24em] text-[#FFF9F0]/85 uppercase"
          style={{ writingMode: "vertical-rl" }}
        >
          {title}
        </div>
      </div>

      {/* Page edges (right) */}
      <div
        className="absolute top-0 right-0"
        style={{
          width: d,
          height: h,
          background:
            "repeating-linear-gradient(to right, #FFF9F0 0 2px, #EADDC5 2px 3px)",
          transformOrigin: "right center",
          transform: `rotateY(90deg) translateX(${half}px)`,
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.18)",
        }}
      />

      {/* Top edge */}
      <div
        className="absolute top-0 left-0"
        style={{
          width: w,
          height: d,
          background:
            "repeating-linear-gradient(to bottom, #FFF9F0 0 1.5px, #E4D4B6 1.5px 2.5px)",
          transformOrigin: "top center",
          transform: `rotateX(90deg) translateY(-${half}px)`,
        }}
      />

      {/* Bottom edge */}
      <div
        className="absolute bottom-0 left-0"
        style={{
          width: w,
          height: d,
          background:
            "repeating-linear-gradient(to bottom, #EDDCC0 0 1.5px, #D5C29E 1.5px 2.5px)",
          transformOrigin: "bottom center",
          transform: `rotateX(-90deg) translateY(${half}px)`,
        }}
      />
    </div>
  );
}

/**
 * Hero 3D scene: a cluster of floating books reacting to pointer + scroll.
 * On pointer-coarse devices only scroll parallax is active.
 */
export function HeroBookScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reducedMotion) return;

    const stage = stageRef.current;
    const scene = sceneRef.current;
    const ribbon = ribbonRef.current;
    if (!stage || !scene) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scrollTarget = 0;
    let scrollCurrent = 0;
    let raf = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      scrollCurrent += (scrollTarget - scrollCurrent) * 0.1;

      const floatY = Math.sin(performance.now() / 1800) * 6;
      const rotY = -22 + currentX * 18 + scrollCurrent * 0.02;
      const rotX = 10 + currentY * 8 - scrollCurrent * 0.015;
      const ty = scrollCurrent * -0.08 + floatY;

      scene.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(0, ${ty}px, 0)`;

      if (ribbon) {
        const sway = Math.sin(performance.now() / 1400) * 3;
        ribbon.style.transform = `rotateZ(${sway}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (coarse) return;
      const rect = stage.getBoundingClientRect();
      targetX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      targetY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      targetX = Math.max(-1, Math.min(1, targetX));
      targetY = Math.max(-1, Math.min(1, targetY));
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };
    const onScroll = () => {
      scrollTarget = window.scrollY;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative mx-auto aspect-square w-full max-w-[32rem] select-none"
      style={{ perspective: "1400px" }}
      aria-hidden="true"
    >
      {/* Soft ground shadow */}
      <div
        className="pointer-events-none absolute bottom-[12%] left-1/2 h-10 w-[60%] -translate-x-1/2 rounded-full bg-black/25 blur-2xl dark:bg-black/55"
        style={{ transform: "translateX(-50%) rotateX(70deg)" }}
      />

      {/* Scene */}
      <div
        ref={sceneRef}
        className="absolute inset-0 transition-transform duration-[60ms] ease-out will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Main book — front, dominant */}
        <Book3D
          w={210}
          h={288}
          d={34}
          cover="linear-gradient(135deg, #1F4D3A 0%, #2F7D4F 45%, #184030 100%)"
          accent="#C98348"
          title="Laut Bercerita"
          author="Leila S. Chudori"
          className="top-1/2 left-1/2 origin-center"
          style={{
            transform:
              "translate3d(-50%, -50%, 40px) rotateY(-8deg) rotateX(-4deg)",
          }}
        />

        {/* Ribbon bookmark */}
        <div
          ref={ribbonRef}
          className="absolute top-1/2 left-1/2 origin-top will-change-transform"
          style={{
            width: 18,
            height: 150,
            transform:
              "translate3d(calc(-50% + 62px), -50%, 58px) rotateX(-4deg)",
            background:
              "linear-gradient(to bottom, #C98348 0%, #A65F2D 100%)",
            boxShadow:
              "0 6px 14px rgba(0,0,0,0.18), inset 0 -6px 12px rgba(0,0,0,0.16)",
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)",
          }}
        />

        {/* Back-left book, tilted */}
        <Book3D
          w={160}
          h={220}
          d={28}
          cover="linear-gradient(135deg, #8B6F4E 0%, #6B5233 55%, #3F2F1B 100%)"
          accent="#F1E4D2"
          title="Bumi Manusia"
          author="Pramoedya"
          style={{
            transform:
              "translate3d(-110%, -72%, -80px) rotateY(-32deg) rotateX(8deg) rotateZ(-6deg)",
            opacity: 0.94,
          }}
        />

        {/* Back-right book, lifted */}
        <Book3D
          w={150}
          h={204}
          d={26}
          cover="linear-gradient(135deg, #C98348 0%, #A55F26 60%, #6C3B14 100%)"
          accent="#FFF9F0"
          title="Cantik Itu Luka"
          author="Eka Kurniawan"
          style={{
            transform:
              "translate3d(40%, -40%, -60px) rotateY(-14deg) rotateX(-8deg) rotateZ(4deg)",
            opacity: 0.95,
          }}
        />

        {/* Bottom stacked book */}
        <Book3D
          w={180}
          h={44}
          d={180}
          cover="linear-gradient(135deg, #2F7D4F 0%, #1F4D3A 100%)"
          accent="#F1E4D2"
          title=""
          style={{
            transform:
              "translate3d(-30%, 62%, -20px) rotateX(68deg) rotateZ(-10deg)",
            opacity: 0.9,
          }}
        />

        {/* Floating page */}
        <div
          className="absolute top-1/2 left-1/2 rounded-sm border border-[#E0D1BD] bg-[#FFF9F0] shadow-[0_12px_30px_rgba(36,26,18,0.18)]"
          style={{
            width: 110,
            height: 150,
            transform:
              "translate3d(110%, -130%, 140px) rotateY(18deg) rotateZ(8deg)",
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 14px, rgba(36,26,18,0.08) 14px 15px)",
          }}
        />
      </div>

      {/* Tiny floating star/quote in front */}
      <div
        className="absolute top-[12%] right-[14%] flex size-12 items-center justify-center rounded-full border border-border bg-card/90 font-serif text-2xl font-semibold text-[#C98348] shadow-[0_10px_30px_rgba(36,26,18,0.14)] backdrop-blur"
        style={{ fontFamily: "var(--font-heading), serif" }}
      >
        &ldquo;
      </div>
    </div>
  );
}
