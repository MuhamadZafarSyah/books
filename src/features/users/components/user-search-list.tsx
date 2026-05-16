"use client";

import { UserSearchRow } from "@/features/users/components/user-search-row";
import type { UserSearchResult } from "@/features/users/types";

type UserSearchListProps = {
  users: UserSearchResult[];
};

/**
 * One unified surface for the entire result set. We use a single bordered
 * container with thin dividers between rows to avoid the "card-on-card"
 * pattern explicitly called out in the design guidelines.
 */
export function UserSearchList({ users }: UserSearchListProps) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card/70">
      {users.map((user) => (
        <UserSearchRow key={user.id} user={user} />
      ))}
    </ul>
  );
}
