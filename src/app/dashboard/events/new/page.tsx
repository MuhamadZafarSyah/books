import type { Metadata } from "next";

import { EventFormShell } from "@/features/reading-events/components/event-form-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buat agenda baca | Shelfgram",
  description: "Buat agenda baca baru dan undang pembaca lain untuk ikut serta.",
};

export default async function NewReadingEventPage() {
  await requireAuth();

  return <EventFormShell mode="create" />;
}
