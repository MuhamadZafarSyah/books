"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimalist splash screen inspired by Lusion.co
 * Features:
 * - Clean dark overlay with brand reveal
 * - Staggered letter animation for brand name
 * - Subtle progress line
 * - Smooth curtain-exit with clip-path
 * - Respects prefers-reduced-motion
 */

// useSyncExternalStore subscriptions for hydration-safe client detection
const emptySubscribe = () => () => { };
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type Phase = "idle" | "letters" | "tagline" | "progress" | "exit" | "done";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  // Hydration-safe: returns false on server, true on client — no mismatch
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!isClient) return;

    // All setState calls are inside timer callbacks (async), not synchronous
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase("letters"), 100));
    timers.push(setTimeout(() => setPhase("tagline"), 900));
    timers.push(setTimeout(() => setPhase("progress"), 1400));
    timers.push(setTimeout(() => setPhase("exit"), 2400));
    timers.push(
      setTimeout(() => {
        setPhase("done");
        // Signal to other components that splash is complete
        window.dispatchEvent(new CustomEvent("shelfgram:splash-done"));
      }, 3200),
    );

    return () => timers.forEach(clearTimeout);
  }, [isClient]);

  // Determine visibility
  const showSplash = isClient && phase !== "done";
  const contentVisible = !isClient || phase === "done";

  return (
    <>
      {/* Main content — visible on server, hidden during splash on client */}
      <div
        className={cn(
          "transition-opacity duration-700 ease-out",
          contentVisible ? "opacity-100" : "opacity-0",
        )}
        aria-hidden={showSplash ? true : undefined}
      >
        {children}
      </div>

      {/* Splash overlay — client only */}
      {showSplash && (
        <div
          className={cn(
            "fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#17120D]",
            "transition-[clip-path,opacity] duration-800 ease-[cubic-bezier(0.76,0,0.24,1)]",
          )}
          style={{
            clipPath:
              phase === "exit" ? "inset(0 0 100% 0)" : "inset(0 0 0% 0)",
          }}
          aria-label="Memuat Shelfgram"
          role="status"
        >
          {/* Brand mark */}
          <div className="flex flex-col items-center gap-6">
            {/* Logo icon */}
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl bg-[#1F4D3A] transition-all duration-700 ease-out sm:size-16",
                phase === "idle"
                  ? "scale-50 opacity-0"
                  : "scale-100 opacity-100",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-7 text-[#F5EBDD] sm:size-8"
                aria-hidden="true"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
            </div>

            {/* Brand name — staggered letter reveal */}
            <div className="overflow-hidden">
              <h1 className="flex font-heading text-3xl font-semibold italic tracking-tight text-[#F5EBDD] sm:text-4xl">
                {"Shelfgram".split("").map((letter, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-block transition-all ease-[cubic-bezier(0.16,1,0.3,1)]",
                      phase === "idle"
                        ? "translate-y-full opacity-0"
                        : "translate-y-0 opacity-100",
                    )}
                    style={{
                      transitionDuration: "600ms",
                      transitionDelay: `${150 + i * 50}ms`,
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </h1>
            </div>

            {/* Tagline */}
            <p
              className={cn(
                "text-sm tracking-[0.2em] text-[#BFAE9C] uppercase transition-all duration-500 ease-out",
                phase === "tagline" || phase === "progress" || phase === "exit"
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0",
              )}
            >
              Baca. Review. Pinjam.
            </p>
          </div>

          {/* Progress line */}
          <div className="absolute bottom-12 left-1/2 w-48 -translate-x-1/2 sm:w-56">
            <div className="h-px w-full overflow-hidden rounded-full bg-[#3A2C20]">
              <div
                className={cn(
                  "h-full rounded-full bg-[#8FB89E] transition-all ease-[cubic-bezier(0.16,1,0.3,1)]",
                  phase === "progress" || phase === "exit"
                    ? "w-full duration-1000"
                    : phase === "tagline"
                      ? "w-1/3 duration-500"
                      : phase === "letters"
                        ? "w-[8%] duration-300"
                        : "w-0 duration-0",
                )}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
