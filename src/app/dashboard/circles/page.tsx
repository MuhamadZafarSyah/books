import type { Metadata } from "next";

import { getMyReadingCircles } from "@/actions/reading-circle";
import { ReadingCircleShell } from "@/features/reading-circle/components/reading-circle-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Circle Baca | Shelfgram",
  description: "Reading circle dan buddy read Anda di Shelfgram.",
};

export default async function ReadingCirclesIndexPage() {
  await requireAuth();
  const history = await getMyReadingCircles();

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-6xl">
      <ReadingCircleShell data={{ circle: null, history }} />
    </div>
  );
}
