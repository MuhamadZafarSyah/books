"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

type LandingScrollSmootherProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function LandingScrollSmoother({
  children,
  className,
  contentClassName,
}: LandingScrollSmootherProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;

    if (!wrapper || !content) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      ScrollTrigger.refresh();
      return;
    }

    let smoother: ScrollSmoother | undefined;
    let initTimeout: number | undefined;
    let refreshFrame: number | undefined;
    let isActive = true;
    const html = document.documentElement;
    const previousScrollBehavior = html.style.scrollBehavior;

    const refreshSmoother = () => {
      if (!isActive) return;

      refreshFrame = window.requestAnimationFrame(() => {
        smoother?.refresh();
        ScrollTrigger.refresh();
      });
    };

    const initSmoother = () => {
      if (!isActive || smoother) return;

      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
      html.style.scrollBehavior = "auto";
      ScrollSmoother.get()?.kill();

      smoother = ScrollSmoother.create({
        wrapper,
        content,
        smooth: 1.15,
        smoothTouch: 0.1,
        effects: true,
        ignoreMobileResize: true,
      });

      refreshSmoother();
    };

    const scheduleInit = () => {
      if (initTimeout) {
        window.clearTimeout(initTimeout);
      }

      initTimeout = window.setTimeout(initSmoother, 120);
    };

    window.addEventListener("shelfgram:splash-done", scheduleInit, {
      once: true,
    });
    window.addEventListener("load", refreshSmoother);

    document.fonts.ready.then(refreshSmoother).catch(() => {
      // Ignore font loading errors; ScrollTrigger will still refresh on resize/load.
    });

    initTimeout = window.setTimeout(initSmoother, 3600);

    return () => {
      isActive = false;
      window.removeEventListener("shelfgram:splash-done", scheduleInit);
      window.removeEventListener("load", refreshSmoother);

      if (initTimeout) {
        window.clearTimeout(initTimeout);
      }

      if (refreshFrame) {
        window.cancelAnimationFrame(refreshFrame);
      }

      smoother?.kill();
      html.style.scrollBehavior = previousScrollBehavior;
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-shelfgram-scroll-smoother="wrapper"
      className={cn("w-full overflow-hidden", className)}
    >
      <div
        ref={contentRef}
        data-shelfgram-scroll-smoother="content"
        className={cn("min-h-dvh w-full", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
