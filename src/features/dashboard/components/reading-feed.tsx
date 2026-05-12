"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";

const feedItems = [
  {
    id: "1",
    type: "review" as const,
    user: {
      name: "Rina Kusuma",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
      username: "@rinakusuma",
    },
    book: {
      title: "Pulang",
      author: "Tere Liye",
      cover:
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=150&fit=crop",
    },
    rating: 4.5,
    content:
      "Buku ini membawa saya ke perjalanan emosional yang luar biasa. Tere Liye berhasil menggambarkan kerinduan akan kampung halaman dengan sangat indah. Setiap bab terasa seperti pelukan hangat dari rumah.",
    likes: 24,
    comments: 8,
    timeAgo: "2 jam lalu",
  },
  {
    id: "2",
    type: "progress" as const,
    user: {
      name: "Andi Pratama",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
      username: "@andipratama",
    },
    book: {
      title: "Sapiens",
      author: "Yuval Noah Harari",
      cover:
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&h=150&fit=crop",
    },
    progress: 75,
    content: "Baru selesai bab tentang revolusi kognitif. Mind-blowing! 🤯",
    likes: 12,
    comments: 3,
    timeAgo: "5 jam lalu",
  },
  {
    id: "3",
    type: "quote" as const,
    user: {
      name: "Maya Sari",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
      username: "@mayasari",
    },
    book: {
      title: "Perahu Kertas",
      author: "Dee Lestari",
      cover:
        "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100&h=150&fit=crop",
    },
    content:
      '"Hidup ini seperti perahu kertas. Rapuh, tapi tetap bisa berlayar melewati ombak yang paling ganas sekalipun."',
    likes: 45,
    comments: 12,
    timeAgo: "1 hari lalu",
  },
];

export function ReadingFeed() {
  return (
    <section>
      <h2 className="mb-4 font-heading text-lg font-semibold tracking-tight">
        Aktivitas Komunitas
      </h2>
      <div className="space-y-4">
        {feedItems.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function FeedCard({ item }: { item: (typeof feedItems)[number] }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="default">
              <AvatarImage src={item.user.avatar} alt={item.user.name} />
              <AvatarFallback>{item.user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.user.name}</span>
                {item.type === "review" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Review
                  </span>
                )}
                {item.type === "quote" && (
                  <span className="rounded-full bg-chart-5/10 px-2 py-0.5 text-[10px] font-medium text-chart-5">
                    Quote
                  </span>
                )}
                {item.type === "progress" && (
                  <span className="rounded-full bg-chart-4/10 px-2 py-0.5 text-[10px] font-medium text-chart-4">
                    Progress
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {item.timeAgo}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Opsi lainnya"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-3 flex gap-3">
          {/* Book cover thumbnail */}
          <div className="hidden h-[90px] w-[60px] shrink-0 overflow-hidden rounded-md shadow-sm sm:block">
            <img
              src={item.book.cover}
              alt={`Cover ${item.book.title}`}
              className="size-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* Book info */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {item.book.title}
              </span>
              <span className="text-xs text-muted-foreground">
                oleh {item.book.author}
              </span>
            </div>

            {/* Rating for reviews */}
            {item.type === "review" && "rating" in item && (
              <div className="mb-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    aria-hidden="true"
                    className={`size-3.5 ${
                      i < Math.floor(item.rating)
                        ? "fill-chart-5 text-chart-5"
                        : i < item.rating
                          ? "fill-chart-5/50 text-chart-5"
                          : "text-muted-foreground/30"
                    }`}
                  />
                ))}
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  {item.rating}
                </span>
              </div>
            )}

            {/* Progress bar for progress type */}
            {item.type === "progress" && "progress" in item && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.progress}% selesai</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-chart-4 transition-all duration-500 ease-out"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Text content */}
            <p
              className={`text-sm leading-relaxed text-foreground/90 ${
                item.type === "quote"
                  ? "border-l-2 border-chart-5/40 pl-3 italic"
                  : ""
              }`}
            >
              {item.content}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-1 border-t border-border/50 pt-3">
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? "Batal suka" : "Suka"}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all duration-200 ${
              liked
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Heart
              aria-hidden="true"
              className={`size-3.5 ${liked ? "fill-current" : ""}`}
            />
            <span>{likeCount}</span>
          </button>

          <button
            type="button"
            aria-label="Komentar"
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
          >
            <MessageCircle aria-hidden="true" className="size-3.5" />
            <span>{item.comments}</span>
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => setSaved(!saved)}
            aria-label={saved ? "Hapus dari simpan" : "Simpan"}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all duration-200 ${
              saved
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Bookmark
              aria-hidden="true"
              className={`size-3.5 ${saved ? "fill-current" : ""}`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
