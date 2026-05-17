import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getReadingEventDetail } from "@/actions/reading-events";
import { EventDetailShell } from "@/features/reading-events/components/event-detail-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail agenda baca | Shelfgram",
  description: "Lihat detail agenda baca dan bergabung sebagai peserta.",
};

type ReadingEventDetailPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function ReadingEventDetailPage({
  params,
}: ReadingEventDetailPageProps) {
  await requireAuth();
  const { eventId } = await params;

  const detail = await getReadingEventDetail(eventId);
  if (!detail) {
    notFound();
  }

  return <EventDetailShell detail={detail} />;
}
