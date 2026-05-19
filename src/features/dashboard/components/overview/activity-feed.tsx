import { Fragment } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarHeart,
  MessageSquare,
  PenLine,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserActivityType } from "@prisma/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SectionHeading } from "@/features/dashboard/components/overview/section-heading";
import {
  formatRelativeTime,
  getInitials,
} from "@/features/dashboard/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardActivityItem } from "@/lib/dashboard/overview-types";

type ActivityFeedProps = {
  items: DashboardActivityItem[];
  emptyHint?: string;
  /** Override label heading. Default: "Komunitas". */
  title?: string;
  description?: string;
  /** Saat `false`, komponen tidak merender heading sendiri (parent yang handle). */
  showHeading?: boolean;
};

const ACTIVITY_ICON: Record<UserActivityType, LucideIcon> = {
  READING_CIRCLE_CREATED: Users,
  READING_CIRCLE_JOINED: Users,
  READING_CIRCLE_POST_CREATED: PenLine,
  READING_CIRCLE_COMMENT_CREATED: MessageSquare,
  READING_EVENT_CREATED: CalendarHeart,
  READING_EVENT_JOINED: CalendarHeart,
  BOOK_REVIEW_CREATED: Star,
  USER_FOLLOW_CREATED: UserPlus,
};

/**
 * Bangun kalimat aksi pendek dalam Bahasa Indonesia.
 *
 * Memilih sentence yang sesuai dengan tipe aktivitas — singkat dan
 * deklaratif sesuai instruksi "tanpa banyak teks".
 */
function describeActivity(
  type: UserActivityType,
): { verb: string; preposition: string } {
  switch (type) {
    case "READING_CIRCLE_CREATED":
      return { verb: "membuat circle", preposition: "" };
    case "READING_CIRCLE_JOINED":
      return { verb: "bergabung di circle", preposition: "" };
    case "READING_CIRCLE_POST_CREATED":
      return { verb: "memposting di", preposition: "" };
    case "READING_CIRCLE_COMMENT_CREATED":
      return { verb: "berkomentar di", preposition: "" };
    case "READING_EVENT_CREATED":
      return { verb: "membuat agenda", preposition: "" };
    case "READING_EVENT_JOINED":
      return { verb: "ikut agenda", preposition: "" };
    case "BOOK_REVIEW_CREATED":
      return { verb: "menulis review", preposition: "untuk" };
    case "USER_FOLLOW_CREATED":
      return { verb: "mengikuti", preposition: "" };
    default:
      return { verb: "beraktivitas", preposition: "" };
  }
}

export function ActivityFeed({
  items,
  emptyHint = "Belum ada aktivitas komunitas. Beraktifitas pertama kali di halaman Jelajahi.",
  title = "Komunitas",
  description = "Aksi terbaru dari pembaca lain.",
  showHeading = true,
}: ActivityFeedProps) {
  return (
    <section aria-labelledby="dashboard-activity-feed">
      {showHeading ? (
        <SectionHeading title={title} description={description} />
      ) : null}

      {items.length === 0 ? (
        <p
          className={cn(
            "rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground",
            showHeading && "mt-3",
          )}
        >
          {emptyHint}
        </p>
      ) : (
        <ul
          className={cn(
            "overflow-hidden rounded-2xl border border-border/60",
            showHeading && "mt-3",
          )}
        >
          {items.map((item, index) => (
            <Fragment key={item.id}>
              {index > 0 ? <Separator /> : null}
              <li>
                <ActivityRow item={item} />
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityRow({ item }: { item: DashboardActivityItem }) {
  const Icon = ACTIVITY_ICON[item.type] ?? BookOpen;
  const { verb, preposition } = describeActivity(item.type);
  const actorName = item.actor.name ?? item.actor.username ?? "Pembaca";
  const subject = item.subjectTitle?.trim() ?? "—";
  const sentence = preposition
    ? `${verb} ${preposition} ${subject}`
    : `${verb} ${subject}`;

  return (
    <div className="flex items-start gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      {/*
        Dua tap target sibling, bukan nested. `<a>` di dalam `<a>` adalah
        HTML invalid (Next 16 throw hydration mismatch), jadi avatar
        memakai Link tersendiri ke profil actor sedangkan area teks ke
        subjek aktivitas (atau div biasa bila subjek tidak resolvable).
      */}
      <Link
        href={`/u/${item.actor.slug}`}
        aria-label={`Lihat profil ${actorName}`}
        className="relative shrink-0 transition-opacity duration-200 hover:opacity-80"
      >
        <Avatar className="size-9">
          <AvatarImage
            src={item.actor.image ?? undefined}
            alt={actorName}
          />
          <AvatarFallback>{getInitials(item.actor.name)}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background text-primary ring-2 ring-background"
        >
          <Icon className="size-3" />
        </span>
      </Link>

      <ActivityRowBody href={item.href}>
        <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-muted-foreground">{sentence}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatRelativeTime(item.createdAt)} · +{item.points} poin
        </p>
      </ActivityRowBody>
    </div>
  );
}

/**
 * Wrapper opsional untuk badan baris.
 *
 * Ketika `href` tersedia kita render `Link` dengan `block` plus efek hover
 * lembut sehingga sebagian besar baris (selain avatar) tetap menjadi
 * tap target ke detail subjek. Ketika `null`, fallback ke `div` biasa
 * agar tidak ada anchor kosong.
 */
function ActivityRowBody({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  if (!href) {
    return <div className="min-w-0 flex-1">{children}</div>;
  }
  return (
    <Link
      href={href}
      className={cn(
        "-mx-2 block min-w-0 flex-1 rounded-md px-2 py-1 transition-colors duration-200",
        "hover:bg-muted/40",
      )}
    >
      {children}
    </Link>
  );
}
