import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { editionIdPathSchema } from "@/features/books/schemas/book-schemas";
import {
  OpenLibraryError,
  getOpenLibraryEdition,
} from "@/lib/open-library";

/**
 * GET /api/books/editions/[editionId]
 *
 * Fetch edition-level detail for an Open Library edition id (e.g. OL12345M).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ editionId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { editionId } = await params;
  const parsed = editionIdPathSchema.safeParse(editionId);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Edition ID tidak valid." },
      { status: 400 },
    );
  }

  try {
    const data = await getOpenLibraryEdition(parsed.data);
    if (!data) {
      return NextResponse.json(
        { error: "Detail edisi tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OpenLibraryError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Detail edisi tidak ditemukan." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Katalog buku sedang sulit diakses. Coba lagi sebentar." },
        { status: 502 },
      );
    }

    console.error("[books/editions] Unhandled error:", error);
    return NextResponse.json(
      { error: "Gagal memuat detail edisi." },
      { status: 500 },
    );
  }
}
