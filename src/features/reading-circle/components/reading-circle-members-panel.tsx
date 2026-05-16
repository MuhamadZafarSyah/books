"use client";

import { Crown, Shield, User2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ReadingCircleMemberSummary,
  ReadingCircleRole,
} from "@/features/reading-circle/types";

type ReadingCircleMembersPanelProps = {
  members: ReadingCircleMemberSummary[];
};

const ROLE_META: Record<
  ReadingCircleRole,
  { label: string; icon: typeof Crown }
> = {
  OWNER: { label: "Owner", icon: Crown },
  MODERATOR: { label: "Mod", icon: Shield },
  MEMBER: { label: "Member", icon: User2 },
};

function getInitials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
  }
  if (email) return email[0]!.toUpperCase();
  return "U";
}

function formatJoined(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffDay = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDay === 0) return "Hari ini";
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function ReadingCircleMembersPanel({
  members,
}: ReadingCircleMembersPanelProps) {
  const sorted = [...members].sort((a, b) => {
    const order = (role: ReadingCircleRole) =>
      role === "OWNER" ? 0 : role === "MODERATOR" ? 1 : 2;
    return order(a.role) - order(b.role);
  });

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card/70 p-4">
      <div>
        <h3 className="font-heading text-sm font-semibold tracking-tight">
          Anggota
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {members.length.toLocaleString("id-ID")} bergabung
        </p>
      </div>

      <ScrollArea className="max-h-72 pr-2">
        <ul className="space-y-2">
          {sorted.map((member) => {
            const role = ROLE_META[member.role];
            const Icon = role.icon;
            return (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-lg p-1.5"
              >
                <Avatar className="size-8 shrink-0">
                  {member.image && (
                    <AvatarImage
                      src={member.image}
                      alt={member.name ?? member.email ?? "Anggota"}
                    />
                  )}
                  <AvatarFallback className="text-[11px]">
                    {getInitials(member.name, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-semibold text-foreground">
                    {member.name ?? member.email ?? "Pembaca"}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    Bergabung {formatJoined(member.joinedAt)}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-3" />
                  {role.label}
                </span>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </section>
  );
}
