import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  ACTIVITY_LABELS,
  ACTIVITY_POINTS,
  ACTIVITY_SCOPE,
} from "@/lib/leaderboard/scoring";
import type {
  LeaderboardScoringResponse,
  LeaderboardScoringRule,
} from "@/features/leaderboard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/leaderboard/scoring`
 *
 * Membungkus konstanta scoring sebagai response API supaya panel "Cara
 * perhitungan" di UI tidak perlu mengimpor modul server (`@/lib/...`)
 * langsung dari Client Component. Disusun terurut dari poin terbesar
 * agar tampilan default di UI sudah ranking-friendly.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules: LeaderboardScoringRule[] = (
    Object.keys(ACTIVITY_POINTS) as Array<keyof typeof ACTIVITY_POINTS>
  )
    .map((type) => ({
      type,
      label: ACTIVITY_LABELS[type].label,
      points: ACTIVITY_POINTS[type],
      scope: ACTIVITY_SCOPE[type],
      notes: ACTIVITY_LABELS[type].notes,
    }))
    .sort((a, b) => b.points - a.points);

  const response: LeaderboardScoringResponse = { rules };
  return NextResponse.json(response);
}
