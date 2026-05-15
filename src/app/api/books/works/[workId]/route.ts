import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { workIdPathSchema } from "@/features/books/schemas/book-schemas";
import {
  OpenLibraryError,
  getOpenLibraryWork,
} from "@/lib/open-library";

/**
 * GET /api/books/works/[workId]
 *
 * Fetch work-level detail for a given Open Library work id (e.g. OL12345W).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workId: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workId } = await params;
  const parsed = workIdPathSchema.safeParse(workId);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Work ID tidak valid." },
      { status: 400 },
    );
  }

  try {
    const data = await getOpenLibraryWork(parsed.data);
    if (!data) {
      return NextResponse.json(
        { error: "Detail buku tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OpenLibraryError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Detail buku tidak ditemukan." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Katalog buku sedang sulit diakses. Coba lagi sebentar." },
        { status: 502 },
      );
    }

    console.error("[books/works] Unhandled error:", error);
    return NextResponse.json(
      { error: "Gagal memuat detail buku." },
      { status: 500 },
    );
  }
}
