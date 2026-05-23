"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type ProgressState = "idle" | "loading" | "complete";

/**
 * Progress bar fixed di atas halaman yang muncul saat navigasi antar
 * halaman (route change) sedang berlangsung.
 *
 * Cara kerja:
 * - Intercept klik pada `<a>` internal dan popstate untuk memulai bar.
 * - Saat pathname/searchParams berubah (halaman baru ter-render), bar
 *   melompat ke 100% lalu fade out.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ProgressState>("idle");
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    setProgress(15);
    setState("loading");

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = Math.max(1, (90 - prev) * 0.08);
        return Math.min(90, prev + increment);
      });
    }, 200);
  }, [clearTimers]);

  // Saat pathname atau searchParams berubah, navigasi selesai.
  // Kita complete progress bar di sini. Effect ini fire setiap kali
  // halaman baru ter-render (URL berubah).
  useEffect(() => {
    // Gunakan microtask agar tidak melanggar aturan "no sync setState in effect"
    void Promise.resolve().then(() => {
      setState((current) => {
        if (current !== "loading") return current;
        // Trigger completion
        clearTimers();
        setProgress(100);

        timeoutRef.current = setTimeout(() => {
          setState("idle");
          setProgress(0);
        }, 300);

        return "complete";
      });
    });
  }, [pathname, searchParams, clearTimers]);

  // Intercept link clicks dan popstate untuk mendeteksi navigasi dimulai
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("target") === "_blank"
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        const currentKey = `${window.location.pathname}${window.location.search}`;
        const nextKey = `${url.pathname}${url.search}`;
        if (currentKey === nextKey) return;
      } catch {
        return;
      }

      startProgress();
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [startProgress, clearTimers]);

  if (state === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-label="Memuat halaman"
      className="fixed inset-x-0 top-0 z-9999 h-[2.5px]"
    >
      <div
        className={cn(
          "h-full bg-primary transition-all ease-out",
          state === "loading" && "duration-200",
          state === "complete" && "duration-200",
        )}
        style={{ width: `${progress}%` }}
      />
      {state === "loading" && (
        <div className="absolute right-0 top-0 h-full w-24 bg-linear-to-l from-primary/40 to-transparent" />
      )}
    </div>
  );
}
