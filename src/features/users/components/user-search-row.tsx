"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserSearchResult } from "@/features/users/types";

type UserSearchRowProps = {
  user: UserSearchResult;
};

function getInitials(name: string | null, username: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
  }
  if (username) return username.slice(0, 2).toUpperCase();
  return "U";
}

export function UserSearchRow({ user }: UserSearchRowProps) {
  const handle = user.username ? `@${user.username}` : `@${user.slug}`;
  const profileHref = `/u/${user.slug}`;

  return (
    <li className="group transition-colors duration-200 hover:bg-secondary/40">
      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
        <Link
          href={profileHref}
          aria-label={`Buka profil ${user.name ?? handle}`}
          className="shrink-0"
        >
          <Avatar className="size-12">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name ?? handle} />
            )}
            <AvatarFallback className="text-[12px]">
              {getInitials(user.name, user.username)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={profileHref} className="block min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {user.name ?? handle}
              </p>
              <span className="truncate text-xs text-muted-foreground">
                {handle}
              </span>
              {user.isFollowing && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Following
                </span>
              )}
            </div>
            {user.bio && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground/95">
                {user.bio}
              </p>
            )}
            {user.location && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                <MapPin aria-hidden="true" className="size-3" />
                {user.location}
              </p>
            )}
          </Link>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn(
            "shrink-0 cursor-pointer rounded-full",
            "opacity-90 transition-opacity duration-200 group-hover:opacity-100",
          )}
        >
          <Link href={profileHref}>
            <span className="hidden sm:inline">Lihat profil</span>
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </Button>
      </div>
    </li>
  );
}
