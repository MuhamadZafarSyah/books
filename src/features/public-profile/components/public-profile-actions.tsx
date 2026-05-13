"use client";

import { useActionState } from "react";
import { MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { useFormStatus } from "react-dom";

import {
  messagePublicProfileUser,
  togglePublicProfileFollow,
  type FollowProfileState,
} from "@/actions/public-profile";
import { Button } from "@/components/ui/button";

function FollowSubmitButton({ isFollowing }: { isFollowing: boolean }) {
  const { pending } = useFormStatus();
  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <Button
      className="w-full cursor-pointer rounded-2xl normal-case tracking-normal sm:w-auto"
      disabled={pending}
      size="lg"
      type="submit"
      variant={isFollowing ? "secondary" : "default"}
    >
      <Icon aria-hidden="true" className="size-4" />
      {pending ? "Memproses..." : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

export function PublicProfileActions({
  followerCount,
  isFollowing,
  isOwnProfile,
  slug,
  targetUserId,
}: {
  followerCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  slug: string;
  targetUserId: string;
}) {
  const initialState: FollowProfileState = { isFollowing, followerCount };
  const [state, formAction] = useActionState(togglePublicProfileFollow, initialState);

  if (isOwnProfile) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Ini profil publik kamu. Kelola bio dan rak dari dashboard.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form action={messagePublicProfileUser} className="w-full sm:w-auto">
        <input name="targetUserId" type="hidden" value={targetUserId} />
        <input name="slug" type="hidden" value={slug} />
        <Button className="w-full cursor-pointer rounded-2xl normal-case tracking-normal sm:w-auto" size="lg" type="submit">
          <MessageCircle aria-hidden="true" className="size-4" />
          Message
        </Button>
      </form>

      <form action={formAction} className="w-full sm:w-auto">
        <input name="targetUserId" type="hidden" value={targetUserId} />
        <input name="slug" type="hidden" value={slug} />
        <FollowSubmitButton isFollowing={state.isFollowing} />
      </form>

      <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-left">
        {state.followerCount} followers
        {state.error && <span className="mt-1 block normal-case tracking-normal text-destructive">{state.error}</span>}
      </div>
    </div>
  );
}
