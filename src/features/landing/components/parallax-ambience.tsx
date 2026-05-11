"use client";

import { useEffect, useRef } from "react";

const NOISE =
  "url('data:image/svg+xml,%3Csvg viewBox=\\'0 0 200 200\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'n\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.72\\' numOctaves=\\'3\\' stitchTiles=\\'stitch\\'/%3E%3C/filter%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' filter=\\'url(%23n)\\'/%3E%3C/svg%3E')";

/**
 * Soft, decorative backdrop: paper-grain overlay + two ambient blobs
 * that drift subtly on scroll. Respects prefers-reduced-motion.
 */
export function ParallaxAmbience() {
  const blobARef = useRef<HTMLDivElement>(null);
  const blobBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let target = 0;
    let current = 0;
    let raf = 0;

    const tick = () => {
      current += (target - current) * 0.12;
      const a = blobARef.current;
      const b = blobBRef.current;
      if (a) a.style.transform = `translate3d(-50%, ${current * -0.18}px, 0)`;
      if (b) b.style.transform = `translate3d(0, ${current * 0.12}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.045] dark:opacity-[0.035]"
        style={{ backgroundImage: NOISE }}
      />
      <div
        ref={blobARef}
        className="absolute -top-32 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-[#d9b98f]/35 blur-3xl will-change-transform dark:bg-[#8fb89e]/10"
      />
      <div
        ref={blobBRef}
        className="absolute top-[38%] -right-40 size-[32rem] rounded-full bg-[#C98348]/20 blur-[120px] will-change-transform dark:bg-[#C98348]/10"
      />
    </div>
  );
}
