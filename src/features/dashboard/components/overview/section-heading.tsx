import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  /** Tombol "Lihat semua" opsional di kanan baris heading. */
  href?: string;
  hrefLabel?: string;
  /** Konten kustom di kanan (mis. badge counter). Mengoverride `href`. */
  trailing?: ReactNode;
  className?: string;
};

/**
 * Heading section sederhana untuk Beranda & Profil.
 *
 * Mengikuti rhythm Agenda Baca: heading kecil dengan optional subhead 1
 * baris dan link "Lihat semua" di kanan. Tidak memakai Card/box agar
 * section terasa flow tanpa boundary visual.
 */
export function SectionHeading({
  title,
  description,
  href,
  hrefLabel,
  trailing,
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h2 className="font-heading text-base font-semibold text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {trailing ? (
        <div className="shrink-0">{trailing}</div>
      ) : href ? (
        <Link
          href={href}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          {hrefLabel ?? "Lihat semua"}
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}
    </header>
  );
}
