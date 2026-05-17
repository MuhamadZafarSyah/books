import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ReadingEventStatus } from "@/features/reading-events/types";

/**
 * Pemetaan status event ke label Bahasa Indonesia + token warna konsisten
 * dengan tema Stitch (forest green primer, krem hangat, accent warm sand,
 * destructive merah-bata). Setiap entri sengaja memakai token CSS variabel
 * agar otomatis adaptif ke mode gelap.
 */
const STATUS_CONFIG: Record<
  ReadingEventStatus,
  { label: string; tone: string }
> = {
  SCHEDULED: {
    label: "Terjadwal",
    tone: "bg-primary/10 text-primary",
  },
  FULL: {
    label: "Penuh",
    tone: "bg-accent text-accent-foreground",
  },
  ONGOING: {
    label: "Berlangsung",
    tone: "bg-primary text-primary-foreground",
  },
  COMPLETED: {
    label: "Selesai",
    tone: "bg-muted text-muted-foreground",
  },
  CANCELLED: {
    label: "Dibatalkan",
    tone: "bg-destructive/10 text-destructive",
  },
};

/**
 * Server-safe status pill untuk Reading Event.
 *
 * Komponen ini sengaja pure (tanpa `"use client"`, tanpa hooks) supaya bisa
 * dirender langsung di Server Component (mis. `event-list-row` saat di-server,
 * `event-detail-shell`). Logika status diturunkan secara terpusat oleh
 * `deriveEventStatus`; komponen ini hanya bertugas memvisualisasikan.
 */
export function EventStatusBadge({ status }: { status: ReadingEventStatus }) {
  const { label, tone } = STATUS_CONFIG[status];

  return (
    <Badge
      data-status={status}
      className={cn("rounded-full px-2 py-0.5 tracking-[0.2em]", tone)}
    >
      {label}
    </Badge>
  );
}
