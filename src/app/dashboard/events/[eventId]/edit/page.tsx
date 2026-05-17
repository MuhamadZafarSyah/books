import type { Metadata } from "next";

import { EventFormShell } from "@/features/reading-events/components/event-form-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sunting agenda baca | Shelfgram",
  description: "Perbarui detail agenda baca yang Anda host.",
};

type EditReadingEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EditReadingEventPage({
  params,
}: EditReadingEventPageProps) {
  await requireAuth();
  const { eventId } = await params;

  return <EventFormShell mode="edit" eventId={eventId} />;
}
