"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, Star, MessageSquare, Heart, Library } from "lucide-react";

const activities = [
  {
    type: "review" as const,
    icon: Star,
    iconColor: "text-chart-5",
    iconBg: "bg-chart-5/10",
    title: "Menulis review",
    book: "Laskar Pelangi",
    author: "Andrea Hirata",
    detail:
      'Rating 4.5 — "Cerita yang menginspirasi tentang perjuangan pendidikan..."',
    time: "2 hari lalu",
  },
  {
    type: "finished" as const,
    icon: BookOpen,
    iconColor: "text-chart-4",
    iconBg: "bg-chart-4/10",
    title: "Selesai membaca",
    book: "Filosofi Teras",
    author: "Henry Manampiring",
    detail: "302 halaman dalam 12 hari",
    time: "5 hari lalu",
  },
  {
    type: "liked" as const,
    icon: Heart,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
    title: "Menyukai review dari",
    book: "Bumi Manusia",
    author: "oleh @mayasari",
    detail: null,
    time: "1 minggu lalu",
  },
  {
    type: "added" as const,
    icon: Library,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Menambahkan ke rak",
    book: "Sapiens",
    author: "Yuval Noah Harari",
    detail: 'Ditambahkan ke "Ingin Dibaca"',
    time: "1 minggu lalu",
  },
  {
    type: "comment" as const,
    icon: MessageSquare,
    iconColor: "text-chart-2",
    iconBg: "bg-chart-2/10",
    title: "Berkomentar di review",
    book: "Perahu Kertas",
    author: "Dee Lestari",
    detail: '"Setuju banget! Bab terakhir bikin nangis..."',
    time: "2 minggu lalu",
  },
];

const mutualReaders = [
  {
    name: "Rina K.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face",
  },
  {
    name: "Andi P.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
  },
  {
    name: "Maya S.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
  },
  {
    name: "Budi R.",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
  },
];

export function ProfileActivity() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Activity Timeline */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium normal-case tracking-normal text-muted-foreground">
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            {activities.map((activity, index) => (
              <div
                key={index}
                className="group relative flex gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-accent/30"
              >
                {/* Icon */}
                <div
                  className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ${activity.iconBg} ring-4 ring-card transition-transform duration-200 group-hover:scale-110`}
                >
                  <activity.icon
                    aria-hidden="true"
                    className={`size-3.5 ${activity.iconColor}`}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm">
                    <span className="text-muted-foreground">
                      {activity.title}{" "}
                    </span>
                    <span className="font-semibold">{activity.book}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {activity.author}
                    </span>
                  </p>
                  {activity.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {activity.detail}
                    </p>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mutual Readers / Community */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium normal-case tracking-normal text-muted-foreground">
            Pembaca Serupa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          {mutualReaders.map((reader) => (
            <div
              key={reader.name}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-accent/50"
            >
              <Avatar size="sm">
                <AvatarImage src={reader.avatar} alt={reader.name} />
                <AvatarFallback>{reader.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{reader.name}</span>
                <p className="text-xs text-muted-foreground">
                  Selera bacaan mirip
                </p>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
              >
                Ikuti
              </button>
            </div>
          ))}

          <p className="pt-2 text-center text-xs text-muted-foreground">
            Berdasarkan buku yang kamu baca
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
