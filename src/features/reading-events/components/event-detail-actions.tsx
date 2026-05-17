"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Pencil, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  cancelReadingEvent,
  leaveReadingEvent,
} from "@/actions/reading-events";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventJoinDialog } from "@/features/reading-events/components/event-join-dialog";
import type { ReadingEventDetail } from "@/features/reading-events/types";

export type EventDetailActionsProps = {
  initialDetail: ReadingEventDetail;
};

/**
 * Event_Detail_Actions (Requirement 4.4–4.7, 5.5–5.7, 6.1, 6.3–6.5,
 * 8.4–8.5, 11.4).
 *
 * Komponen klien yang memilih tombol aksi berdasarkan peran pengguna
 * (Host / Participant / Viewer) dan `EventStatus` saat ini:
 *
 * - **Host**: tombol "Edit" (Link ke halaman edit) dan "Batalkan event"
 *   (`variant="destructive"` dengan dialog konfirmasi sebelum memanggil
 *   `cancelReadingEvent`).
 * - **Participant non-Host**: tombol "Batalkan keikutsertaan" yang
 *   memanggil `leaveReadingEvent` (Requirement 4.6, 6.1, 6.3, 6.4, 6.5).
 * - **Viewer joinable**: tombol "Bergabung" yang membuka
 *   `EventJoinDialog` (Requirement 4.5, 5.1, 5.2). Hanya ditampilkan bila
 *   status `SCHEDULED` dan `participantCount < quota` (Requirement 5.6,
 *   7.2, 7.3).
 * - **CANCELLED**: tidak ada aksi yang dirender (banner di shell sudah
 *   menjelaskan; Requirement 4.4, 8.5).
 *
 * Setelah server action sukses, state lokal di-set dengan
 * `ReadingEventDetail` baru dari server dan `router.refresh()` dipanggil
 * agar Server Component induk (counter peserta, daftar peserta,
 * komentar) ikut menyinkronkan tanpa reload halaman penuh
 * (Requirement 5.5, 11.4).
 */
export function EventDetailActions({ initialDetail }: EventDetailActionsProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<ReadingEventDetail>(initialDetail);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isLeavePending, startLeaveTransition] = useTransition();
  const [isCancelPending, startCancelTransition] = useTransition();

  const handleSuccess = (next: ReadingEventDetail) => {
    setDetail(next);
    router.refresh();
  };

  const handleLeave = () => {
    startLeaveTransition(async () => {
      try {
        const next = await leaveReadingEvent(detail.id);
        toast.success("Keikutsertaan dibatalkan.");
        handleSuccess(next);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal membatalkan keikutsertaan.",
        );
      }
    });
  };

  const handleCancelEvent = () => {
    startCancelTransition(async () => {
      try {
        const next = await cancelReadingEvent(detail.id);
        toast.success("Agenda baca dibatalkan.");
        handleSuccess(next);
        setCancelDialogOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Gagal membatalkan agenda baca.",
        );
      }
    });
  };

  // Event yang sudah dibatalkan tidak menampilkan aksi apa pun; banner
  // di shell sudah memberi konteks (Requirement 4.4, 8.5).
  if (detail.status === "CANCELLED") {
    return null;
  }

  const containerClass =
    "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center";

  if (detail.isHost) {
    return (
      <div className={containerClass}>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <Link href={`/dashboard/events/${detail.id}/edit`}>
            <Pencil aria-hidden="true" data-icon="inline-start" />
            Edit
          </Link>
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="cursor-pointer"
          disabled={isCancelPending}
          onClick={() => setCancelDialogOpen(true)}
        >
          <XCircle aria-hidden="true" data-icon="inline-start" />
          Batalkan event
        </Button>

        <Dialog
          open={cancelDialogOpen}
          onOpenChange={(next) => {
            // Cegah penutupan dialog saat aksi sedang berjalan.
            if (isCancelPending && !next) return;
            setCancelDialogOpen(next);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Batalkan agenda?</DialogTitle>
              <DialogDescription>
                Peserta akan melihat status &quot;Dibatalkan&quot; dan tidak
                bisa lagi bergabung. Tindakan ini tidak dapat dikembalikan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCancelPending}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isCancelPending}
                className="cursor-pointer"
                onClick={handleCancelEvent}
              >
                {isCancelPending ? (
                  <Loader2
                    aria-hidden="true"
                    className="size-3.5 animate-spin"
                  />
                ) : null}
                Ya, batalkan agenda
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (detail.isParticipant) {
    // Status `ONGOING`/`COMPLETED` dijaga server (Requirement 6.3); kita
    // tetap menyembunyikan tombol leave saat status tersebut agar UI
    // tidak menawarkan aksi yang pasti gagal.
    if (detail.status !== "SCHEDULED" && detail.status !== "FULL") {
      return null;
    }

    return (
      <div className={containerClass}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={isLeavePending}
          onClick={handleLeave}
        >
          {isLeavePending ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <LogOut aria-hidden="true" data-icon="inline-start" />
          )}
          Batalkan keikutsertaan
        </Button>
      </div>
    );
  }

  // Viewer (belum participant). Hanya tampilkan tombol Bergabung jika
  // event masih `SCHEDULED` dan slot tersedia (Requirement 4.5, 5.6, 7.2).
  const isJoinable =
    detail.status === "SCHEDULED" && detail.participantCount < detail.quota;

  if (!isJoinable) {
    return null;
  }

  return (
    <div className={containerClass}>
      <Button
        type="button"
        size="sm"
        className="cursor-pointer"
        onClick={() => setJoinDialogOpen(true)}
      >
        <UserPlus aria-hidden="true" data-icon="inline-start" />
        Bergabung
      </Button>

      <EventJoinDialog
        eventId={detail.id}
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
