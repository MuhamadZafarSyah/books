import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getReadingCirclePageData } from "@/actions/reading-circle";
import { ReadingCircleShell } from "@/features/reading-circle/components/reading-circle-shell";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ circleId: string }>;
}): Promise<Metadata> {
  const { circleId } = await params;
  await requireAuth();
  const data = await getReadingCirclePageData(circleId);
  if (!data) return { title: "Circle tidak ditemukan | Shelfgram" };
  return { title: `${data.circle.title} | Shelfgram` };
}

export default async function ReadingCircleDetailPage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
  const { circleId } = await params;
  await requireAuth();
  const data = await getReadingCirclePageData(circleId);
  if (!data) notFound();

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-6xl">
      <ReadingCircleShell data={data} />
    </div>
  );
}
