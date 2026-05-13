import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) ?? "shelfgram/banners";

    if (!file) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5MB." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadImage(buffer, {
      folder,
      publicId: `${session.user.id}-${Date.now()}`,
      transformation: {
        quality: "auto",
        fetch_format: "auto",
        width: 1200,
        crop: "limit",
      },
    });

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah gambar. Coba lagi." },
      { status: 500 },
    );
  }
}
