"use client";

import { Fragment } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { ReadingEventParticipantSummary } from "@/features/reading-events/types";

type EventCommentsListProps = {
  participants: ReadingEventParticipantSummary[];
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getInitials(name: string | null) {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() ?? "P";
}

function formatJoinedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function EventCommentsList({ participants }: EventCommentsListProps) {
  let entries: ReadingEventParticipantSummary[] = [];
  let sortFailed = false;

  try {
    entries = participants
      .filter((p) => p.comment !== null && p.comment.trim().length > 0)
      .slice()
      .sort((a, b) => {
        const at = new Date(a.joinedAt).getTime();
        const bt = new Date(b.joinedAt).getTime();
        if (Number.isNaN(at) || Number.isNaN(bt)) {
          throw new Error("invalid date");
        }
        return bt - at;
      });
  } catch {
    sortFailed = true;
  }

  if (sortFailed) {
    return (
      <section aria-label="Komentar peserta" className="space-y-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Komentar peserta
        </h3>
        <p className="text-sm text-muted-foreground">
          Komentar peserta sedang dimuat
        </p>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section aria-label="Komentar peserta" className="space-y-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Komentar peserta
        </h3>
        <p className="text-sm text-muted-foreground">
          Belum ada komentar dari peserta
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Komentar peserta" className="space-y-3">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Komentar peserta
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({entries.length})
        </span>
      </h3>
      <ul className="flex flex-col">
        {entries.map((entry, index) => {
          const displayName = entry.name && entry.name.trim().length > 0 ? entry.name : "Pembaca";
          return (
            <Fragment key={entry.id}>
              <li className="flex items-start gap-3 py-3">
                <Avatar className="size-8">
                  {entry.image ? (
                    <AvatarImage
                      alt={displayName}
                      src={entry.image}
                    />
                  ) : null}
                  <AvatarFallback className="text-[11px]">
                    {getInitials(entry.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatJoinedAt(entry.joinedAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {entry.comment}
                  </p>
                </div>
              </li>
              {index < entries.length - 1 ? <Separator /> : null}
            </Fragment>
          );
        })}
      </ul>
    </section>
  );
}
