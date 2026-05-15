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
}: BookCoverProps) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;

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
        <Image
          src={src}
          alt={`Cover ${title}`}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setErrored(true)}
          className="object-cover"
        />
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
