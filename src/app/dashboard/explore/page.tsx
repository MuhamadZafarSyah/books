import type { Metadata } from "next";
import { Suspense } from "react";

import { BookSearchExperience } from "@/features/books/components/book-search-experience";
import { requireAuth } from "@/lib/session";

export const metadata: Metadata = {
  title: "Jelajahi | Shelfgram",
  description:
    "Cari dan jelajahi buku dari katalog Open Library di Shelfgram.",
};

export default async function ExplorePage() {
  await requireAuth();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Suspense>
        <BookSearchExperience />
      </Suspense>
    </div>
  );
}
