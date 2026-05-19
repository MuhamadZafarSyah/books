import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

type BookCoverProps = {
  src: string | null;
  alt: string;
  className?: string;
};

/**
 * Cover buku ringkas dengan placeholder Lucide bila gambar tidak tersedia.
 *
 * Komponen Server-safe (tidak ada hook/state) supaya bisa dirender dari
 * Server Component pada Beranda dan Profil tanpa boundary tambahan.
 */
export function BookCover({ src, alt, className }: BookCoverProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex size-full items-center justify-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <BookOpen aria-hidden="true" className="size-1/3" />
    </div>
  );
}
