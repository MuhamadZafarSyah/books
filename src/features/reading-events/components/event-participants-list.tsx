"use client";

import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ReadingEventParticipantSummary } from "@/features/reading-events/types";

type EventParticipantsListProps = {
  participants: ReadingEventParticipantSummary[];
  hostId: string;
};

/**
 * Mengambil inisial 1–2 huruf dari nama pengguna.
 *
 * - Nama kosong/`null` → fallback "P" (Pembaca), sesuai Requirement 11.2
 *   yang meminta placeholder generik saat data nama tidak tersedia.
 * - Nama satu kata → 2 huruf pertama.
 * - Nama lebih dari satu kata → huruf pertama dari dua kata pertama.
 */
function getInitials(name: string | null): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) {
    return (parts[0]?.slice(0, 2) ?? "P").toUpperCase();
  }
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * Daftar peserta Reading Event.
 *
 * Komponen Client karena dirender di dalam `event-detail-shell` yang ikut
 * memuat aksi interaktif lainnya; menjaga boundary klien tetap konsisten
 * meski komponen ini sendiri tidak menggunakan state. Tidak memakai `Card`
 * untuk menghindari nested boxes (lihat AGENTS.md "Do not overuse Card") —
 * cukup list row dengan border lembut + permukaan `bg-background`.
 *
 * Validates: Requirements 4.1, 11.2
 */
export function EventParticipantsList({
  participants,
  hostId,
}: EventParticipantsListProps) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
        <Users aria-hidden="true" className="size-4 text-muted-foreground" />
        <span>Peserta ({participants.length})</span>
      </h3>

      <ul className="grid gap-3 sm:grid-cols-2">
        {participants.map((participant) => {
          const displayName =
            participant.name && participant.name.trim().length > 0
              ? participant.name
              : "Pembaca";
          const isHost = participant.userId === hostId;

          return (
            <li
              key={participant.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarImage
                  src={participant.image ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="text-[11px]">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-foreground">
                  {displayName}
                </p>
              </div>

              {isHost ? (
                <Badge
                  className={cn(
                    "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] tracking-[0.18em] text-primary",
                  )}
                >
                  Host
                </Badge>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
