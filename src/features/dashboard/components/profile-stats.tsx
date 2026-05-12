
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";

const recentBooks = [
  {
    id: "1",
    title: "Filosofi Teras",
    author: "Henry Manampiring",
    cover:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&h=180&fit=crop",
    rating: 5,
  },
  {
    id: "2",
    title: "Atomic Habits",
    author: "James Clear",
    cover:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=120&h=180&fit=crop",
    rating: 4,
  },
  {
    id: "3",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    cover:
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120&h=180&fit=crop",
    rating: 5,
  },
  {
    id: "4",
    title: "Bumi Manusia",
    author: "Pramoedya A.T.",
    cover:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=120&h=180&fit=crop",
    rating: 5,
  },
  {
    id: "5",
    title: "Laut Bercerita",
    author: "Leila S. Chudori",
    cover:
      "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=120&h=180&fit=crop",
    rating: 4,
  },
  {
    id: "6",
    title: "Pulang",
    author: "Tere Liye",
    cover:
      "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=120&h=180&fit=crop",
    rating: 4,
  },
];

const genres = [
  { name: "Fiksi Sastra", count: 15, color: "bg-primary" },
  { name: "Non-Fiksi", count: 12, color: "bg-chart-2" },
  { name: "Sejarah", count: 8, color: "bg-chart-3" },
  { name: "Sains", count: 5, color: "bg-chart-4" },
  { name: "Filsafat", count: 4, color: "bg-chart-5" },
];

const readingStats = {
  thisYear: 14,
  totalPages: 4280,
  avgRating: 4.3,
  longestStreak: 21,
};

export function ProfileStats() {
  const totalGenreBooks = genres.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="space-y-5">
      {/* Reading Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Buku Tahun Ini"
          value={String(readingStats.thisYear)}
        />
        <MiniStat
          label="Total Halaman"
          value={readingStats.totalPages.toLocaleString()}
        />
        <MiniStat
          label="Rata-rata Rating"
          value={String(readingStats.avgRating)}
        />
        <MiniStat
          label="Streak Terlama"
          value={`${readingStats.longestStreak} hari`}
        />
      </div>

      {/* Book Shelf Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium normal-case tracking-normal text-muted-foreground">
            Buku yang Sudah Dibaca
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {recentBooks.map((book) => (
                <div
                  key={book.id}
                  className="group w-[90px] shrink-0 cursor-pointer"
                >
                  <div className="relative aspect-2/3 overflow-hidden rounded-md shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                    <img
                      src={book.cover}
                      alt={`Cover ${book.title}`}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Rating overlay */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-0.5 bg-linear-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
                      <Star
                        aria-hidden="true"
                        className="size-2.5 fill-chart-5 text-chart-5"
                      />
                      <span className="text-[10px] font-bold text-white">
                        {book.rating}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium">
                    {book.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {book.author}
                  </p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Genre Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium normal-case tracking-normal text-muted-foreground">
            Genre Favorit
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {/* Visual genre bars */}
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {genres.map((genre) => (
              <div
                key={genre.name}
                className={`${genre.color} transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${(genre.count / totalGenreBooks) * 100}%` }}
                title={`${genre.name}: ${genre.count} buku`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {genres.map((genre) => (
              <div key={genre.name} className="flex items-center gap-1.5">
                <span
                  className={`size-2.5 rounded-full ${genre.color}`}
                  aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">
                  {genre.name}
                </span>
                <span className="text-xs font-medium">{genre.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-sm">
      <CardContent className="flex flex-col items-center gap-0.5 p-3 text-center">
        <span className="font-heading text-lg font-bold sm:text-xl">
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
