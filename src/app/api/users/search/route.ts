import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { searchUsers } from "@/lib/users/search";
import { userSearchParamsSchema } from "@/features/users/schemas/user-search-schemas";
import { MIN_USER_SEARCH_QUERY_LENGTH } from "@/features/users/search-constants";
import type { UserSearchResponse } from "@/features/users/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/search?q=...&limit=...
 *
 * Auth-gated. Returns a ranked list of users matching the query, with
 * follow state from the perspective of the current user. Empty or very short
 * queries return an empty payload without touching the database.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = userSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Permintaan pencarian tidak valid." },
      { status: 400 },
    );
  }

  const { q = "", limit } = parsed.data;
  const query = q.trim();

  if (query.length < MIN_USER_SEARCH_QUERY_LENGTH) {
    const payload: UserSearchResponse = {
      query,
      total: 0,
      results: [],
    };
    return NextResponse.json(payload);
  }

  try {
    const results = await searchUsers({
      query,
      limit,
      currentUserId: session.user.id,
    });

    const payload: UserSearchResponse = {
      query,
      total: results.length,
      results,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[users/search] Unhandled error:", error);
    return NextResponse.json(
      { error: "Gagal memuat hasil pencarian." },
      { status: 500 },
    );
  }
}
