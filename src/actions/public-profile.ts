"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { startDirectConversation } from "@/actions/chat";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { recordActivityEvent } from "@/lib/leaderboard/record-activity";

const profileActionSchema = z.object({
  targetUserId: z.string().min(1),
  slug: z.string().min(1).max(120),
});

export type FollowProfileState = {
  isFollowing: boolean;
  followerCount: number;
  error?: string;
};

async function requireActionUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return session.user.id;
}

export async function messagePublicProfileUser(formData: FormData) {
  await requireActionUser();

  const parsed = profileActionSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect("/dashboard/chat");
  }

  const conversationId = await startDirectConversation(parsed.data.targetUserId);
  redirect(`/dashboard/chat?conversation=${conversationId}`);
}

export async function togglePublicProfileFollow(
  previousState: FollowProfileState,
  formData: FormData,
): Promise<FollowProfileState> {
  const currentUserId = await requireActionUser();
  const parsed = profileActionSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { ...previousState, error: "Profil tidak valid." };
  }

  const { targetUserId, slug } = parsed.data;

  if (targetUserId === currentUserId) {
    return { ...previousState, error: "Kamu tidak bisa follow profil sendiri." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    return { ...previousState, error: "Profil tidak ditemukan." };
  }

  const existingFollow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {
    await prisma.userFollow.delete({ where: { id: existingFollow.id } });
  } else {
    await prisma.userFollow.create({
      data: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    // Plan: "unfollow tidak mencatat poin negatif pada MVP"; pencatatan
    // dilakukan hanya saat follow baru dibuat. `dedupeKey` memastikan
    // sequence follow → unfollow → follow ulang tidak menggandakan poin.
    await recordActivityEvent({
      userId: currentUserId,
      type: "USER_FOLLOW_CREATED",
      sourceType: "USER_FOLLOW",
      sourceId: targetUserId,
      dedupeKey: `user-follow:create:${currentUserId}:${targetUserId}`,
    });
  }

  const followerCount = await prisma.userFollow.count({
    where: { followingId: targetUserId },
  });

  revalidatePath(`/u/${slug}`);

  return {
    isFollowing: !existingFollow,
    followerCount,
  };
}
