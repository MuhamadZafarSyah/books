import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { getLeaderboardPage } from "@/lib/leaderboard/queries";
import { leaderboardQuerySchema } from "@/features/leaderboard/schemas/leaderboard-schemas";
import type { LeaderboardResponse } from "@/features/leaderboard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/leaderboard`
 *
 * Mengembalikan ranking utama untuk satu kombinasi `period` + `scope`.
 * Perlu sesi NextAuth — leaderboard adalah destination internal Shelfgram,
 * bukan halaman publik.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = leaderboardQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Parameter tidak valid." },
      { status: 400 },
    );
  }

  const data: LeaderboardResponse = await getLeaderboardPage(parsed.data);
  return NextResponse.json(data);
}
