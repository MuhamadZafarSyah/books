import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { getLeaderboardForViewer } from "@/lib/leaderboard/queries";
import { leaderboardMeQuerySchema } from "@/features/leaderboard/schemas/leaderboard-schemas";
import type { LeaderboardMeResponse } from "@/features/leaderboard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/leaderboard/me`
 *
 * Mengembalikan posisi viewer pada leaderboard saat ini sehingga panel
 * "Posisi kamu" dapat di-fetch tanpa memuat seluruh ranking.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = leaderboardMeQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Parameter tidak valid." },
      { status: 400 },
    );
  }

  const data: LeaderboardMeResponse = await getLeaderboardForViewer({
    userId: session.user.id,
    period: parsed.data.period,
    scope: parsed.data.scope,
  });
  return NextResponse.json(data);
}
