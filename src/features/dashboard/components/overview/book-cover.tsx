import Image from "next/image";
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
      <span className="relative block size-full">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 45vw, 180px"
          className={cn("object-contain", className)}
        />
      </span>
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
