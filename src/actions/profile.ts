"use server";

import { revalidatePath } from "next/cache";

import {
  editProfileSchema,
  type EditProfileFormValues,
} from "@/features/dashboard/schemas/profile-schemas";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { profileSlugFor } from "@/lib/public-profile";

type ProfileActionResult = {
  success: boolean;
  error?: string;
};

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

export async function updateProfile(
  values: EditProfileFormValues,
): Promise<ProfileActionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: "Sesi kamu berakhir. Silakan masuk lagi." };
  }

  const parsed = editProfileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data profil tidak valid.",
    };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
    },
  });

  if (!currentUser) {
    return { success: false, error: "Profil tidak ditemukan." };
  }

  const username = parsed.data.username.toLowerCase();

  if (username) {
    const existingUsername = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existingUsername) {
      return { success: false, error: "Username sudah digunakan." };
    }
  }

  const previousSlug = profileSlugFor(currentUser);
  const nextProfile = {
    id: currentUser.id,
    username: emptyToNull(username),
    name: parsed.data.name,
    email: currentUser.email,
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      username: nextProfile.username,
      bio: emptyToNull(parsed.data.bio),
      location: emptyToNull(parsed.data.location),
      image: emptyToNull(parsed.data.image),
    },
  });

  const nextSlug = profileSlugFor(nextProfile);

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/profile/edit");
  revalidatePath(`/u/${previousSlug}`);
  revalidatePath(`/u/${nextSlug}`);

  return { success: true };
}
