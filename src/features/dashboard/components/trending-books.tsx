"use client";

import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Star } from "lucide-react";

const trendingBooks = [
  {
    id: "1",
    title: "Laut Bercerita",
    author: "Leila S. Chudori",
    cover:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60&h=90&fit=crop",
    rating: 4.7,
    readers: 342,
  },
  {
    id: "2",
    title: "Cantik Itu Luka",
    author: "Eka Kurniawan",
    cover:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=60&h=90&fit=crop",
    rating: 4.5,
    readers: 289,
  },
  {
    id: "3",
    title: "Ronggeng Dukuh Paruk",
    author: "Ahmad Tohari",
    cover:
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=60&h=90&fit=crop",
    rating: 4.6,
    readers: 256,
  },
  {
    id: "4",
    title: "Hujan",
    author: "Tere Liye",
    cover:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=60&h=90&fit=crop",
    rating: 4.3,
    readers: 198,
  },
];

export function TrendingBooks() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-muted-foreground">
          <TrendingUp aria-hidden="true" className="size-4 text-chart-4" />
          Trending Minggu Ini
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {trendingBooks.map((book, index) => (
          <div
            key={book.id}
            className="group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-accent/50"
          >
            {/* Rank */}
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
              {index + 1}
            </span>

            {/* Cover */}
            <div className="relative h-[48px] w-[32px] shrink-0 overflow-hidden rounded shadow-sm">
              <Image
                src={book.cover}
                alt={`Cover ${book.title}`}
                fill
                sizes="32px"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium leading-tight">
                {book.title}
              </h4>
              <p className="truncate text-xs text-muted-foreground">
                {book.author}
              </p>
            </div>

            {/* Rating */}
            <div className="flex shrink-0 items-center gap-0.5">
              <Star
                aria-hidden="true"
                className="size-3 fill-chart-5 text-chart-5"
              />
              <span className="text-xs font-medium">{book.rating}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
