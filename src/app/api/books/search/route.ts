import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { bookSearchParamsSchema } from "@/features/books/schemas/book-schemas";
import {
  OpenLibraryError,
  searchOpenLibraryBooks,
} from "@/lib/open-library";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/books/search
 *
 * Proxies and normalizes the Open Library search endpoint.
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit(`books-search:${session.user.id}`);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Terlalu banyak pencarian. Coba lagi sebentar." },
      { status: 429 },
    );
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = bookSearchParamsSchema.safeParse(params);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return NextResponse.json(
      { error: firstIssue ?? "Pencarian buku tidak valid." },
      { status: 400 },
    );
  }

  try {
    const data = await searchOpenLibraryBooks(parsed.data);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OpenLibraryError) {
      return NextResponse.json(
        {
          error:
            error.status === 504
              ? "Pencarian terlalu lama. Coba lagi sebentar."
              : "Katalog buku sedang sulit diakses. Coba lagi sebentar.",
        },
        { status: 502 },
      );
    }

    console.error("[books/search] Unhandled error:", error);
    return NextResponse.json(
      { error: "Gagal memuat hasil pencarian." },
      { status: 500 },
    );
  }
}
