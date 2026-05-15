import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  subjectBrowseParamsSchema,
  subjectPathSchema,
} from "@/features/books/schemas/book-schemas";
import {
  OpenLibraryError,
  getOpenLibrarySubject,
} from "@/lib/open-library";

/**
 * GET /api/books/subjects/[subject]
 *
 * Browse books for a subject/genre via the Open Library subjects endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subject: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject } = await params;
  const subjectParsed = subjectPathSchema.safeParse(subject);

  if (!subjectParsed.success) {
    return NextResponse.json(
      { error: "Subject tidak valid." },
      { status: 400 },
    );
  }

  const queryParams = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );
  const browseParsed = subjectBrowseParamsSchema.safeParse(queryParams);

  if (!browseParsed.success) {
    return NextResponse.json(
      { error: "Parameter pencarian tidak valid." },
      { status: 400 },
    );
  }

  try {
    const data = await getOpenLibrarySubject(subjectParsed.data, browseParsed.data);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OpenLibraryError) {
      return NextResponse.json(
        {
          error:
            error.status === 504
              ? "Pencarian subject terlalu lama. Coba lagi."
              : "Katalog buku sedang sulit diakses. Coba lagi sebentar.",
        },
        { status: 502 },
      );
    }

    console.error("[books/subjects] Unhandled error:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar subject." },
      { status: 500 },
    );
  }
}
