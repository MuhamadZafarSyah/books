import type { Metadata } from "next";

import { EventListShell } from "@/features/reading-events/components/event-list-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agenda Baca | Shelfgram",
  description:
    "Telusuri agenda baca komunitas Shelfgram dan ikut serta pada sesi tatap muka.",
};

export default async function ReadingEventsIndexPage() {
  await requireAuth();

  return <EventListShell />;
}
