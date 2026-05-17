import Link from "next/link";
import { BookOpen, Clock, MapPin, Users, XCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EventCommentsList } from "@/features/reading-events/components/event-comments-list";
import { EventDetailActions } from "@/features/reading-events/components/event-detail-actions";
import { EventMapView } from "@/features/reading-events/components/event-map-view";
import { EventParticipantsList } from "@/features/reading-events/components/event-participants-list";
import { EventStatusBadge } from "@/features/reading-events/components/event-status-badge";
import type { ReadingEventDetail } from "@/features/reading-events/types";

type EventDetailShellProps = {
  detail: ReadingEventDetail;
};

/**
 * Formatter waktu Bahasa Indonesia untuk meta event (waktu mulai / selesai).
 *
 * `dateStyle: "full"` + `timeStyle: "short"` mengeluarkan format manusiawi
 * seperti "Senin, 12 Maret 2025 pukul 19.30" yang sesuai dengan tone editorial
 * Shelfgram pada layar detail (Requirement 4.1, 12.1).
 */
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "full",
  timeStyle: "short",
});

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_TIME_FORMATTER.format(date);
}

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
 * Event_Detail_View shell (Server Component).
 *
 * Menyusun layout halaman detail Reading Event sesuai Requirement 4.1, 4.2,
 * 4.4, dan 12.1:
 *
 * - Banner "Event dibatalkan" muncul di bagian atas saat
 *   `detail.status === "CANCELLED"` (Requirement 4.4). Tombol aksi
 *   disembunyikan oleh `EventDetailActions`, jadi shell hanya bertanggung
 *   jawab atas konteks visual.
 * - Header berisi judul + `EventStatusBadge` inline + info host (avatar +
 *   nama) sebagai konteks utama.
 * - Body dibagi dua kolom pada `lg:` ke atas (`grid-cols-[1.6fr_1fr]`):
 *   kiri menampung deskripsi dan meta (alamat, waktu, kuota, referensi
 *   buku); kanan menampung peta interaktif (`EventMapView`) dan tombol
 *   aksi (`EventDetailActions`). Pada layar < `lg` semua kolom turun ke
 *   satu kolom (Requirement 12.1).
 * - Daftar peserta dan komentar diletakkan di bawah dengan `Separator`
 *   sebagai pemisah ringan, mengikuti aturan AGENTS.md "Do not overuse
 *   Card".
 *
 * Tidak memakai `"use client"`: data sudah berbentuk view-model
 * (ISO string + primitif), seluruh komputasi (formatting tanggal,
 * inisial avatar) bisa dilakukan di server. Aksi interaktif tetap di
 * island klien (`EventDetailActions`, `EventParticipantsList`,
 * `EventCommentsList`, `EventMapView`).
 */
export function EventDetailShell({ detail }: EventDetailShellProps) {
  const isCancelled = detail.status === "CANCELLED";
  const hostDisplayName =
    detail.hostName && detail.hostName.trim().length > 0
      ? detail.hostName
      : "Pembaca";
  const hasDescription =
    detail.description !== null && detail.description.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {isCancelled ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Event dibatalkan</p>
            <p className="text-destructive/80">
              Host telah membatalkan agenda baca ini. Anda tidak dapat lagi
              bergabung atau mengubah keikutsertaan.
            </p>
          </div>
        </div>
      ) : null}

      <header className="space-y-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            {detail.title}
          </h1>
          <span className="mt-1 inline-flex">
            <EventStatusBadge status={detail.status} />
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0">
            <AvatarImage
              src={detail.hostImage ?? undefined}
              alt={hostDisplayName}
            />
            <AvatarFallback className="text-[11px]">
              {getInitials(detail.hostName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Host
            </p>
            <p className="line-clamp-1 text-sm font-medium text-foreground">
              {hostDisplayName}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {hasDescription ? (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {detail.description}
            </p>
          ) : null}

          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Lokasi
                </dt>
                <dd className="text-foreground">{detail.locationAddress}</dd>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Waktu
                </dt>
                <dd className="text-foreground">
                  Mulai {formatDateTime(detail.startsAt)}
                </dd>
                <dd className="text-muted-foreground">
                  Selesai {formatDateTime(detail.endsAt)}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Peserta
                </dt>
                <dd className="text-foreground tabular-nums">
                  {detail.participantCount} dari {detail.quota} peserta
                </dd>
              </div>
            </div>

            {detail.bookReferenceUrl ? (
              <div className="flex items-start gap-2">
                <BookOpen
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 space-y-0.5">
                  <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Referensi buku
                  </dt>
                  <dd>
                    <Link
                      href={detail.bookReferenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary underline-offset-4 transition-colors duration-200 hover:underline"
                    >
                      {detail.bookReferenceUrl}
                    </Link>
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="space-y-4">
          <EventMapView
            latitude={detail.latitude}
            longitude={detail.longitude}
            locationAddress={detail.locationAddress}
          />
          <EventDetailActions initialDetail={detail} />
        </div>
      </div>

      <Separator />

      <EventParticipantsList
        participants={detail.participants}
        hostId={detail.hostId}
      />

      <Separator />

      <EventCommentsList participants={detail.participants} />
    </div>
  );
}
