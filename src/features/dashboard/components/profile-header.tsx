import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Edit, BookOpen, Users, Star, ExternalLink, type LucideIcon } from "lucide-react";
import { profileSlugFor } from "@/lib/public-profile";
import { formatJoinedAt } from "@/utils/sharedUtils";

type ProfileUser = {
  id?: string | null;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  bio?: string | null;
  location?: string | null;
  createdAt?: string | Date | null;
  banner?: string | null;
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

type ProfileHeaderStat = {
  label: string;
  value: string;
  icon: LucideIcon;
};

const defaultProfileStats = [
  { label: "Buku Dibaca", value: "42", icon: BookOpen },
  { label: "Pengikut", value: "128", icon: Users },
  { label: "Review", value: "18", icon: Star },
];

export function ProfileHeader({
  actions,
  showPublicProfileLink = true,
  stats = defaultProfileStats,
  user,
}: {
  actions?: ReactNode;
  showPublicProfileLink?: boolean;
  stats?: ProfileHeaderStat[];
  user: ProfileUser;
}) {
  const banner = user.banner?.trim();
  const publicProfileSlug = profileSlugFor({
    id: user.id ?? user.email ?? "me",
    username: user.username ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    banner: user.banner ?? null,
  });

  const headerActions = actions ?? (
    <div className="flex flex-wrap items-center gap-2">
      {showPublicProfileLink && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 rounded-full border-border bg-card/85 normal-case tracking-normal shadow-sm backdrop-blur-sm transition-colors duration-200 hover:bg-card"
        >
          <Link href={`/u/${publicProfileSlug}`}>
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Profil Publik
          </Link>
        </Button>
      )}
      <Button
        asChild
        size="sm"
        className="cursor-pointer gap-1.5 rounded-full normal-case tracking-normal shadow-sm transition-colors duration-200"
      >
        <Link href="/dashboard/profile/edit">
          <Edit aria-hidden="true" className="size-3.5" />
          Edit Profil
        </Link>
      </Button>
    </div>
  );

  return (
    <Card className="overflow-hidden mt-0! pt-0!">
      {/* Cover/Banner */}
      <div className="relative h-32 bg-linear-to-br from-primary/20 via-primary/10 to-accent/30 sm:h-40">
        {banner ? (
          <Image
            src={banner}
            alt={`Banner profil ${user.name ?? "pengguna"}`}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2MmgxMnptLTItMjJoMnYyaC0yVjhoMnYyaC0ydi0yem0yIDEwdjJoLTEydi0yaDEyem0tMTIgNGgxMnYySDI0di0yem0xMi04SDI0di0yaDEydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

        {/* Action buttons — desktop: floating top-right of banner */}
        <div className="absolute right-4 top-4 hidden sm:flex">{headerActions}</div>
      </div>

      <CardContent className="relative px-5 pb-5 sm:px-6">
        {/* Avatar + mobile actions row */}
        <div className="-mt-12 mb-4 flex items-end justify-between gap-3 sm:-mt-14">
          <Avatar className="size-20 border-4 border-card shadow-lg sm:size-24">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name ?? "Avatar"} />
            )}
            <AvatarFallback className="text-xl font-bold">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>

          {/* Mobile: actions below avatar baseline */}
          <div className="flex pb-1 sm:hidden">{headerActions}</div>
        </div>

        {/* User Info */}
        <div className="space-y-3">
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {user.name ?? "Pembaca"}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-foreground/80">
            {user.bio ?? "Pecinta sastra Indonesia dan buku-buku non-fiksi. Selalu mencari cerita yang menginspirasi dan membuka perspektif baru. Senang berbagi rekomendasi bacaan."}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3" />
              {user.location ?? "Jakarta, Indonesia"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar aria-hidden="true" className="size-3" />
              Bergabung {formatJoinedAt(user.createdAt)}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/50 pt-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm">
                <stat.icon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <span className="font-bold">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
