"use client";

import { Component, Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Spline = lazy(() => import("@splinetool/react-spline"));

type SplineErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type SplineErrorBoundaryState = {
  hasError: boolean;
};

class SplineErrorBoundary extends Component<
  SplineErrorBoundaryProps,
  SplineErrorBoundaryState
> {
  state: SplineErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Spline scene failed to load", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const isMobile = useIsMobile();

  const fallback = (
    <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[2rem] bg-card/60 px-6 text-center">
      <div>
        <p className="font-heading text-lg font-semibold text-foreground">
          Tampilan 3D tidak tersedia
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Halaman tetap bisa digunakan tanpa scene interaktif.
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return null;
  }

  return (
    <SplineErrorBoundary fallback={fallback} key={scene}>
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
    </SplineErrorBoundary>
  );
}

