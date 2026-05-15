import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { isbnPathSchema } from "@/features/books/schemas/book-schemas";
import {
  OpenLibraryError,
  getOpenLibraryIsbn,
} from "@/lib/open-library";

/**
 * GET /api/books/isbn/[isbn]
 *
 * Lookup a single edition by ISBN-10 or ISBN-13.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { isbn } = await params;
  const parsed = isbnPathSchema.safeParse(isbn);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "ISBN tidak valid." },
      { status: 400 },
    );
  }

  try {
    const data = await getOpenLibraryIsbn(parsed.data);
    if (!data) {
      return NextResponse.json(
        { error: "Buku dengan ISBN tersebut tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OpenLibraryError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Buku dengan ISBN tersebut tidak ditemukan." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Katalog buku sedang sulit diakses. Coba lagi sebentar." },
        { status: 502 },
      );
    }

    console.error("[books/isbn] Unhandled error:", error);
    return NextResponse.json(
      { error: "Gagal memuat detail buku." },
      { status: 500 },
    );
  }
}
