"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

type BookCoverProps = {
  src: string | null | undefined;
  title: string;
  className?: string;
  rounded?: "md" | "lg" | "xl";
  /** Hint to next/image about display size. */
  sizes?: string;
  priority?: boolean;
  hoverZoom?: boolean;
};

const ROUNDED = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

export function BookCover({
  src,
  title,
  className,
  rounded = "md",
  sizes = "(min-width: 1280px) 200px, (min-width: 768px) 25vw, 45vw",
  priority = false,
  hoverZoom = false,
}: BookCoverProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const showFallback = !src || erroredSrc === src;
  const isLoading = Boolean(src) && loadedSrc !== src && erroredSrc !== src;

  return (
    <div
      className={cn(
        "relative isolate aspect-[2/3] w-full overflow-hidden bg-muted",
        ROUNDED[rounded],
        className,
      )}
    >
      {showFallback ? (
        <NoCoverFallback title={title} />
      ) : (
        <>
          <Image
            src={src}
            alt={`Cover ${title}`}
            fill
            sizes={sizes}
            priority={priority}
            onLoad={() => setLoadedSrc(src)}
            onError={() => setErroredSrc(src)}
            className={cn(
              "object-cover",
              hoverZoom &&
                "scale-100 transform-gpu motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.07] motion-safe:group-focus-visible:scale-[1.05]",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 z-10 bg-muted transition-opacity duration-300",
              isLoading ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-card/70 to-transparent bg-[length:200%_100%] motion-safe:animate-[book-cover-shimmer_1.25s_ease-in-out_infinite] motion-reduce:animate-pulse" />
          </div>
        </>
      )}
    </div>
  );
}

function NoCoverFallback({ title }: { title: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary via-muted to-accent/40 p-3 text-center"
    >
      <ImageOff
        aria-hidden="true"
        className="size-6 text-muted-foreground/70"
        strokeWidth={1.5}
      />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        No cover
      </span>
      <span className="line-clamp-3 px-1 font-heading text-[11px] leading-snug text-foreground/70">
        {title}
      </span>
    </div>
  );
}
