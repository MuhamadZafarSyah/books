"use client";

import { Lock, MessagesSquare } from "lucide-react";

import { ReadingCirclePostCard } from "@/features/reading-circle/components/reading-circle-post-card";
import { ReadingCirclePostDialog } from "@/features/reading-circle/components/reading-circle-post-dialog";
import type { ReadingCircleDetail } from "@/features/reading-circle/types";

type ReadingCircleFeedProps = {
  circle: ReadingCircleDetail;
  onUpdated: (next: ReadingCircleDetail) => void;
};

export function ReadingCircleFeed({ circle, onUpdated }: ReadingCircleFeedProps) {
  const isMember = circle.myRole !== null;

  if (!circle.canView) {
    return (
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <PrivateNotice />
      </div>
    );
  }

  if (circle.posts.length === 0) {
    return (
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <EmptyDiscussion
          isMember={isMember}
          circleId={circle.id}
          onUpdated={onUpdated}
        />
      </div>
    );
  }

  return (
    <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <ul className="mx-auto max-w-3xl space-y-4">
        {circle.posts.map((post) => (
          <li key={post.id}>
            <ReadingCirclePostCard
              post={post}
              isMember={isMember}
              onUpdated={onUpdated}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyDiscussion({
  isMember,
  circleId,
  onUpdated,
}: {
  isMember: boolean;
  circleId: string;
  onUpdated: (next: ReadingCircleDetail) => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <MessagesSquare aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
        Belum ada diskusi
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {isMember
          ? "Mulai diskusi pertama untuk menyalakan circle ini."
          : "Bergabunglah ke circle ini untuk mulai berdiskusi."}
      </p>
      {isMember && (
        <div className="mt-4 flex justify-center">
          <ReadingCirclePostDialog circleId={circleId} onPosted={onUpdated} />
        </div>
      )}
    </div>
  );
}

function PrivateNotice() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <Lock aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
        Circle privat
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Hanya anggota yang bisa melihat diskusi di circle ini.
      </p>
    </div>
  );
}
