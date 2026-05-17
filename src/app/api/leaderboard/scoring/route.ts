import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  LEADERBOARD_SCORING_RULES,
} from "@/lib/leaderboard/scoring";
import type {
  LeaderboardScoringResponse,
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

  const response: LeaderboardScoringResponse = {
    rules: LEADERBOARD_SCORING_RULES,
  };
  return NextResponse.json(response);
}
