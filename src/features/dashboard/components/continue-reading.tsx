"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const currentlyReading = [
  {
    id: "1",
    title: "Filosofi Teras",
    author: "Henry Manampiring",
    cover:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop",
    progress: 68,
    lastRead: "Hari ini",
    currentPage: 204,
    totalPages: 302,
  },
  {
    id: "2",
    title: "Atomic Habits",
    author: "James Clear",
    cover:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&h=300&fit=crop",
    progress: 42,
    lastRead: "Kemarin",
    currentPage: 126,
    totalPages: 306,
  },
  {
    id: "3",
    title: "Laskar Pelangi",
    author: "Andrea Hirata",
    cover:
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200&h=300&fit=crop",
    progress: 15,
    lastRead: "3 hari lalu",
    currentPage: 45,
    totalPages: 292,
  },
  {
    id: "4",
    title: "Bumi Manusia",
    author: "Pramoedya Ananta Toer",
    cover:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&h=300&fit=crop",
    progress: 89,
    lastRead: "Minggu lalu",
    currentPage: 320,
    totalPages: 360,
  },
];

export function ContinueReading() {
  if (currentlyReading.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
            <BookOpen
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          </div>
          <h3 className="mt-4 font-heading text-lg font-semibold">
            Belum ada buku yang dibaca
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Mulai perjalanan membacamu dengan menambahkan buku pertama ke rak.
          </p>
          <Button className="mt-4 cursor-pointer rounded-full" size="sm">
            Jelajahi Buku
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Lanjutkan Membaca
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          Lihat Semua
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {currentlyReading.map((book) => (
            <BookProgressCard key={book.id} book={book} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

function BookProgressCard({
  book,
}: {
  book: (typeof currentlyReading)[number];
}) {
  return (
    <Card className="group w-[260px] shrink-0 cursor-pointer overflow-hidden transition-all duration-300  hover:shadow-lg sm:w-[280px]">
      <CardContent className="p-0">
        <div className="flex gap-3 p-4">
          {/* Book Cover */}
          <div className="relative h-[120px] w-[80px] shrink-0 overflow-hidden rounded-md shadow-md">
            <img
              src={book.cover}
              alt={`Cover buku ${book.title}`}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Progress overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent px-1.5 pb-1.5 pt-4">
              <span className="text-[10px] font-bold text-white">
                {book.progress}%
              </span>
            </div>
          </div>

          {/* Book Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <div>
              <h3 className="truncate text-sm font-semibold leading-tight">
                {book.title}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {book.author}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Hal. {book.currentPage}/{book.totalPages}
                </span>
                <span>{book.lastRead}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${book.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
