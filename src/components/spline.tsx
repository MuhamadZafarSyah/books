"use client";

import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[2rem] bg-card/60">
          <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <span className="sr-only">Memuat tampilan 3D Shelfgram</span>
        </div>
      }
    >
      <Spline className={className} scene={scene} />
    </Suspense>
  );
}
