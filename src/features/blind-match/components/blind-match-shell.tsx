"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookMarked,
  BookOpen,
  Check,
  HelpCircle,
  Heart,
  Inbox,
  LibraryBig,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  acceptBlindInterest,
  declineBlindInterest,
  generateBlindMatchCandidates,
  saveBlindMatchProfile,
  sendBlindInterest,
  setBlindMatchPaused,
  skipBlindCandidate,
  startBlindMatchChat,
} from "@/actions/blind-match";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  blindMatchProfileSchema,
  type BlindMatchProfileFormValues,
  type BlindMatchProfileInput,
} from "@/features/blind-match/schemas/blind-match-schemas";
import type {
  BlindMatchBookPreview,
  BlindMatchCandidateView,
  BlindMatchHomeData,
  BlindMatchInboxItem,
  BlindMatchReaderProfile,
} from "@/features/blind-match/types";
import { cn } from "@/lib/utils";

type View = "swipe" | "inbox";

type PendingAction =
  | "save-profile"
  | "generate"
  | "pause"
  | "resume"
  | `skip:${string}`
  | `interest:${string}`
  | `accept:${string}`
  | `decline:${string}`
  | `chat:${string}`
  | null;

const interestOptions = [
  "Fantasy",
  "Romance",
  "Mystery",
  "Self-growth",
  "Historical",
  "Sci-fi",
  "Literary",
  "Cozy read",
  "Dark academia",
  "Non-fiction",
];

const intentLabels = {
  CASUAL_DISCUSSION: "Diskusi santai",
  GENRE_BUDDY: "Genre buddy",
  EVENT_BUDDY: "Buddy acara",
  SURPRISE_ME: "Surprise me",
} as const;

const bookStatusLabels: Record<BlindMatchBookPreview["status"], string> = {
  WANT_TO_READ: "Wishlist",
  TO_BE_READ: "Antrian",
  READING: "Dibaca",
  FINISHED: "Selesai",
  ON_HOLD: "Jeda",
  ABANDONED: "Ditinggal",
};

export function BlindMatchShell({ data }: { data: BlindMatchHomeData }) {
  const router = useRouter();
  const [view, setView] = useState<View>("swipe");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const isBusy = isPending || pendingAction !== null;
  const isPaused = data.profile?.status === "PAUSED";
  const visibleCandidates = data.candidates.filter(
    (candidate) => !dismissedIds.has(candidate.id),
  );
  const currentCandidate = visibleCandidates[0] ?? null;
  const inboxCount = data.incomingInterests.length + data.matches.length;

  const dismissCandidate = (candidateId: string) => {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(candidateId);
      return next;
    });
  };

  const runAction = (
    action: PendingAction,
    task: () => Promise<void>,
    onSuccess?: () => void,
  ) => {
    setPendingAction(action);
    startTransition(async () => {
      try {
        await task();
        onSuccess?.();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Aksi Blind Reading gagal. Coba lagi sebentar.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleGenerate = () =>
    runAction("generate", async () => {
      const count = await generateBlindMatchCandidates();
      toast.success(
        count > 0 ? `${count} kartu baru siap.` : "Belum ada kartu baru hari ini.",
      );
    });

  if (!data.profile) {
    return (
      <MobileFrame>
        <MobileHeader title="Blind Reading" subtitle="Match lewat rak buku." />
        <JoinScreen
          data={data}
          disabled={isBusy}
          pending={pendingAction === "save-profile"}
          onSubmit={(values) =>
            runAction("save-profile", async () => {
              await saveBlindMatchProfile(values);
              await generateBlindMatchCandidates();
              toast.success("Blind Reading aktif.");
            })
          }
        />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame>
      <MobileHeader
        title="Blind Reading"
        subtitle={isPaused ? "Discovery dijeda." : `${visibleCandidates.length} kartu siap.`}
        action={
          <div className="flex items-center gap-2" data-blind-tour="header-actions">
            <IconTooltip title="Panduan Fitur">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="cursor-pointer rounded-full"
                data-blind-tour="guide"
                onClick={() => void startBlindReadingTour()}
              >
                <HelpCircle />
                <span className="sr-only">Buka panduan fitur</span>
              </Button>
            </IconTooltip>
            <PreferenceSheet
              data={data}
              disabled={isBusy}
              pending={pendingAction === "save-profile"}
              onSubmit={(values) =>
                runAction("save-profile", async () => {
                  await saveBlindMatchProfile(values);
                  toast.success("Preferensi disimpan.");
                })
              }
            />
            <span className="relative inline-flex">
              <StickyHeaderTourAnchor target="pause" />
              <IconTooltip title={isPaused ? "Aktifkan Discover" : "Jeda Discover"}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="cursor-pointer rounded-full"
                  disabled={isBusy}
                  onClick={() =>
                    runAction(isPaused ? "resume" : "pause", async () => {
                      await setBlindMatchPaused(!isPaused);
                      toast.success(isPaused ? "Discovery aktif." : "Discovery dijeda.");
                    })
                  }
                >
                  {pendingAction === "pause" || pendingAction === "resume" ? (
                    <Loader2 className="animate-spin" />
                  ) : isPaused ? (
                    <Play />
                  ) : (
                    <Pause />
                  )}
                  <span className="sr-only">{isPaused ? "Aktifkan Discover" : "Jeda Discover"}</span>
                </Button>
              </IconTooltip>
            </span>
          </div>
        }
      />

      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {view === "swipe" ? (
          <SwipeView
            candidate={currentCandidate}
            dailyRemaining={data.dailyRemaining}
            paused={isPaused}
            disabled={isBusy || isPaused}
            pendingAction={pendingAction}
            onGenerate={handleGenerate}
            onSkip={(candidate) =>
              runAction(
                `skip:${candidate.id}`,
                async () => {
                  await skipBlindCandidate(candidate.id);
                  toast.success("Dilewati.");
                },
                () => dismissCandidate(candidate.id),
              )
            }
            onInterest={(candidate) =>
              runAction(
                `interest:${candidate.id}`,
                async () => {
                  const mutual = await sendBlindInterest(candidate.id);
                  toast.success(mutual ? "Match!" : "Interest terkirim.");
                },
                () => dismissCandidate(candidate.id),
              )
            }
          />
        ) : (
          <InboxView
            incoming={data.incomingInterests}
            sent={data.sentInterests}
            matches={data.matches}
            disabled={isBusy}
            pendingAction={pendingAction}
            onAccept={(item) =>
              runAction(`accept:${item.id}`, async () => {
                await acceptBlindInterest(item.id);
                toast.success("Match terbuka.");
              })
            }
            onDecline={(item) =>
              runAction(`decline:${item.id}`, async () => {
                await declineBlindInterest(item.id);
                toast.success("Interest dilewati.");
              })
            }
            onStartChat={(item) =>
              runAction(`chat:${item.id}`, async () => {
                const conversationId = await startBlindMatchChat(item.id);
                router.push(`/dashboard/chat?conversation=${conversationId}`);
              })
            }
          />
        )}
      </main>

      <BottomNav view={view} inboxCount={inboxCount} onChange={setView} />
    </MobileFrame>
  );
}

function MobileFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-4">{children}</div>;
}

function MobileHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky -top-4 z-20 -mx-4 flex items-center justify-between gap-4 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:px-0">
      <div className="min-w-0" data-blind-tour="header">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles aria-hidden className="size-3" />
          Shelfgram
        </p>
        <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function IconTooltip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StickyHeaderTourAnchor({ target }: { target: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 translate-y-0"
      data-blind-tour={target}
    />
  );
}

async function startBlindReadingTour() {
  const { default: introJs } = await import("intro.js");
  const steps = buildBlindReadingTourSteps();

  if (steps.length === 0) {
    toast.info("Panduan belum tersedia di layar ini.");
    return;
  }

  introJs()
    .setOptions({
      steps,
      showProgress: true,
      showBullets: false,
      exitOnOverlayClick: true,
      disableInteraction: false,
      nextLabel: "Lanjut",
      prevLabel: "Kembali",
      doneLabel: "Selesai",
      tooltipClass: "shelfgram-intro",
      highlightClass: "shelfgram-intro-highlight",
      scrollTo: "off",
      scrollToElement: false,
      helperElementPadding: 4,
    })
    .start();
}

function buildBlindReadingTourSteps() {
  const steps: Array<{ element: Element; title: string; intro: string }> = [];
  const add = (selector: string, title: string, intro: string) => {
    const element = document.querySelector(selector);
    if (element) steps.push({ element, title, intro });
  };

  add(
    '[data-blind-tour="header"]',
    "Blind Reading",
    "Temukan pembaca lewat profile singkat dan rak buku publik, bukan foto.",
  );
  add(
    '[data-blind-tour="preferences"]',
    "Preferensi",
    "Atur taste dan vibe ngobrol agar kartu yang muncul lebih relevan.",
  );
  add(
    '[data-blind-tour="pause"]',
    "Jeda Discover",
    "Pakai ini kalau ingin menonaktifkan discovery sementara.",
  );
  add(
    '[data-blind-tour="reader-card"]',
    "Kartu Pembaca",
    "Baca ringkasannya dulu: vibe, bio pendek, genre, dan rak singkat.",
  );
  add(
    '[data-blind-tour="bookshelf"]',
    "Rak Buku",
    "Cek rak publik sebelum memutuskan skip atau interest.",
  );
  add(
    '[data-blind-tour="actions"]',
    "Aksi",
    "Skip kalau tidak cocok, Interest kalau ingin dia melihat sinyalmu.",
  );
  add(
    '[data-blind-tour="bottom-nav"]',
    "Inbox",
    "Buka Inbox untuk melihat interest masuk, interest terkirim, dan match.",
  );

  return steps;
}

function JoinScreen({
  data,
  disabled,
  pending,
  onSubmit,
}: {
  data: BlindMatchHomeData;
  disabled: boolean;
  pending: boolean;
  onSubmit: (values: BlindMatchProfileInput) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LibraryBig aria-hidden className="size-5" />
        </span>
        <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          Join untuk mulai swipe.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Lihat profile singkat, cek rak publik, lalu kirim interest kalau cocok.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniStat label="Rak" value={data.eligibility.shelfCount} />
          <MiniStat label="Review" value={data.eligibility.reviewCount} />
          <MiniStat label="Quote" value={data.eligibility.quoteCount} />
        </div>
      </section>

      <BlindMatchProfileForm
        data={data}
        disabled={disabled}
        pending={pending}
        submitLabel="Join Blind Reading"
        onSubmit={onSubmit}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/45 px-3 py-3 text-center">
      <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PreferenceSheet({
  data,
  disabled,
  pending,
  onSubmit,
}: {
  data: BlindMatchHomeData;
  disabled: boolean;
  pending: boolean;
  onSubmit: (values: BlindMatchProfileInput) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <span className="relative inline-flex">
          <StickyHeaderTourAnchor target="preferences" />
          <IconTooltip title="Preferensi Discover">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="cursor-pointer rounded-full"
              disabled={disabled}
            >
              <Settings2 />
              <span className="sr-only">Edit preferensi discover</span>
            </Button>
          </IconTooltip>
        </span>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <SheetHeader className="p-5 pb-2">
          <SheetTitle className="font-heading text-xl normal-case tracking-tight">
            Preferensi
          </SheetTitle>
          <SheetDescription>Atur singkat supaya kartu lebih relevan.</SheetDescription>
        </SheetHeader>
        <BlindMatchProfileForm
          data={data}
          disabled={disabled}
          pending={pending}
          submitLabel="Simpan"
          variant="plain"
          stickySubmit
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}

function SwipeView({
  candidate,
  dailyRemaining,
  paused,
  disabled,
  pendingAction,
  onGenerate,
  onSkip,
  onInterest,
}: {
  candidate: BlindMatchCandidateView | null;
  dailyRemaining: number;
  paused: boolean;
  disabled: boolean;
  pendingAction: PendingAction;
  onGenerate: () => void;
  onSkip: (candidate: BlindMatchCandidateView) => void;
  onInterest: (candidate: BlindMatchCandidateView) => void;
}) {
  if (!candidate) {
    return (
      <EmptyDeck
        paused={paused}
        dailyRemaining={dailyRemaining}
        disabled={disabled}
        pending={pendingAction === "generate"}
        onGenerate={onGenerate}
      />
    );
  }

  return (
    <ReaderCard
      candidate={candidate}
      disabled={disabled}
      pendingAction={pendingAction}
      onSkip={() => onSkip(candidate)}
      onInterest={() => onInterest(candidate)}
    />
  );
}

function ReaderCard({
  candidate,
  disabled,
  pendingAction,
  onSkip,
  onInterest,
}: {
  candidate: BlindMatchCandidateView;
  disabled: boolean;
  pendingAction: PendingAction;
  onSkip: () => void;
  onInterest: () => void;
}) {
  const profile = candidate.profile;
  const books = preferredBooks(profile);

  return (
    <article
      className="flex min-h-[35rem] flex-col rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm"
      data-blind-tour="reader-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge variant="secondary" className="text-primary">
            {candidate.compatibilityScore}% cocok
          </Badge>
          <h2 className="mt-3 truncate font-heading text-3xl font-semibold tracking-tight">
            {profile.displayName}
          </h2>
          <p className="text-sm text-muted-foreground">{profile.readingVibe}</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen aria-hidden className="size-5" />
        </span>
      </div>

      <p className="mt-5 line-clamp-3 text-base leading-7 text-foreground/85">
        {profile.bio ?? "Pembaca ini lebih banyak bercerita lewat rak publiknya."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.preferredGenres.slice(0, 3).map((genre) => (
          <Badge key={genre} variant="outline">
            {genre}
          </Badge>
        ))}
      </div>

      <section className="mt-6 flex flex-1 flex-col gap-3 rounded-[1.5rem] bg-muted/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Rak singkat
          </p>
          <BookMarked aria-hidden className="size-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          {books.length > 0 ? (
            books.slice(0, 3).map((book) => <BookLine key={book.id} book={book} />)
          ) : (
            <p className="text-sm text-muted-foreground">Rak publik masih minim.</p>
          )}
        </div>
      </section>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {candidate.matchHint}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <BookshelfSheet
          profile={profile}
          trigger={
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer rounded-full"
              data-blind-tour="bookshelf"
              aria-label={`Lihat rak buku ${profile.displayName}`}
            >
              <LibraryBig data-icon="inline-start" />
              Lihat rak buku
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-2" data-blind-tour="actions">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer rounded-full"
            disabled={disabled}
            onClick={onSkip}
          >
            {pendingAction === `skip:${candidate.id}` ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <X data-icon="inline-start" />
            )}
            Skip
          </Button>
          <Button
            type="button"
            className="cursor-pointer rounded-full"
            disabled={disabled || !candidate.canSendInterest}
            onClick={onInterest}
          >
            {pendingAction === `interest:${candidate.id}` ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Heart data-icon="inline-start" />
            )}
            Interest
          </Button>
        </div>
      </div>
    </article>
  );
}

function EmptyDeck({
  paused,
  dailyRemaining,
  disabled,
  pending,
  onGenerate,
}: {
  paused: boolean;
  dailyRemaining: number;
  disabled: boolean;
  pending: boolean;
  onGenerate: () => void;
}) {
  const title = paused
    ? "Discovery dijeda"
    : dailyRemaining <= 0
      ? "Kartu hari ini habis"
      : "Deck kosong";
  const copy = paused
    ? "Aktifkan lagi untuk browse pembaca."
    : dailyRemaining <= 0
      ? "Cek inbox atau kembali besok."
      : "Ambil kartu baru untuk mulai swipe.";

  return (
    <section className="flex min-h-[32rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-card/55 p-6 text-center">
      <span className="grid size-14 place-items-center rounded-3xl bg-primary/10 text-primary">
        <LibraryBig aria-hidden className="size-6" />
      </span>
      <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{copy}</p>
      <Button
        type="button"
        className="mt-6 cursor-pointer rounded-full"
        disabled={disabled || paused || dailyRemaining <= 0}
        onClick={onGenerate}
      >
        {pending ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <RefreshCw data-icon="inline-start" />
        )}
        Cari kartu
      </Button>
    </section>
  );
}

function InboxView({
  incoming,
  sent,
  matches,
  disabled,
  pendingAction,
  onAccept,
  onDecline,
  onStartChat,
}: {
  incoming: BlindMatchInboxItem[];
  sent: BlindMatchInboxItem[];
  matches: BlindMatchInboxItem[];
  disabled: boolean;
  pendingAction: PendingAction;
  onAccept: (item: BlindMatchInboxItem) => void;
  onDecline: (item: BlindMatchInboxItem) => void;
  onStartChat: (item: BlindMatchInboxItem) => void;
}) {
  const items = [...matches, ...incoming, ...sent];

  if (items.length === 0) {
    return (
      <section className="flex min-h-[32rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-card/55 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-3xl bg-primary/10 text-primary">
          <Inbox aria-hidden className="size-6" />
        </span>
        <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          Inbox kosong
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          Interest dan match baru akan muncul di sini.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-blind-tour="inbox-list">
      {items.map((item) => (
        <InboxCard
          key={`${item.direction}:${item.id}`}
          item={item}
          disabled={disabled}
          pendingAction={pendingAction}
          onAccept={() => onAccept(item)}
          onDecline={() => onDecline(item)}
          onStartChat={() => onStartChat(item)}
        />
      ))}
    </div>
  );
}

function InboxCard({
  item,
  disabled,
  pendingAction,
  onAccept,
  onDecline,
  onStartChat,
}: {
  item: BlindMatchInboxItem;
  disabled: boolean;
  pendingAction: PendingAction;
  onAccept: () => void;
  onDecline: () => void;
  onStartChat: () => void;
}) {
  const profile = item.profile;
  const label =
    item.direction === "match"
      ? "Match"
      : item.direction === "incoming"
        ? "Masuk"
        : "Terkirim";

  return (
    <article className="rounded-[1.6rem] border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-xl font-semibold tracking-tight">
            {profile.displayName}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{profile.readingVibe}</p>
        </div>
        <Badge variant="secondary" className="text-primary">
          {label}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground/80">
        {profile.bio ?? item.matchHint}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <BookshelfSheet
          profile={profile}
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full"
              aria-label={`Lihat rak buku ${profile.displayName}`}
            >
              <LibraryBig data-icon="inline-start" />
              Rak
            </Button>
          }
        />

        {item.direction === "incoming" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer rounded-full"
              disabled={disabled}
              aria-label={`Terima interest dari ${profile.displayName}`}
              onClick={onAccept}
            >
              {pendingAction === `accept:${item.id}` ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              Match
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer rounded-full"
              disabled={disabled}
              aria-label={`Lewati interest dari ${profile.displayName}`}
              onClick={onDecline}
            >
              {pendingAction === `decline:${item.id}` ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <X data-icon="inline-start" />
              )}
              Lewati
            </Button>
          </>
        ) : item.direction === "match" ? (
          <>
            {profile.slug ? (
              <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-full">
                <Link href={`/u/${profile.slug}`} aria-label={`Lihat profil ${profile.displayName}`}>
                  Profil
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="cursor-pointer rounded-full"
              disabled={disabled}
              aria-label={`Mulai chat dengan ${profile.displayName}`}
              onClick={onStartChat}
            >
              {pendingAction === `chat:${item.id}` ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <MessageCircle data-icon="inline-start" />
              )}
              Chat
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="rounded-full" disabled>
            Menunggu
          </Button>
        )}
      </div>
    </article>
  );
}

function BottomNav({
  view,
  inboxCount,
  onChange,
}: {
  view: View;
  inboxCount: number;
  onChange: (view: View) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto w-[calc(100%-2rem)] max-w-md rounded-full border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85"
      data-blind-tour="bottom-nav"
    >
      <div className="grid grid-cols-2 gap-1">
        <Button
          type="button"
          variant={view === "swipe" ? "default" : "ghost"}
          className="cursor-pointer rounded-full"
          aria-pressed={view === "swipe"}
          onClick={() => onChange("swipe")}
        >
          <Heart data-icon="inline-start" />
          Swipe
        </Button>
        <Button
          type="button"
          variant={view === "inbox" ? "default" : "ghost"}
          className="cursor-pointer rounded-full"
          aria-pressed={view === "inbox"}
          onClick={() => onChange("inbox")}
        >
          <Inbox data-icon="inline-start" />
          Inbox {inboxCount > 0 ? inboxCount : ""}
        </Button>
      </div>
    </nav>
  );
}

function BlindMatchProfileForm({
  data,
  disabled,
  pending,
  submitLabel,
  variant = "card",
  stickySubmit = false,
  onSubmit,
}: {
  data: BlindMatchHomeData;
  disabled: boolean;
  pending: boolean;
  submitLabel: string;
  variant?: "card" | "plain";
  stickySubmit?: boolean;
  onSubmit: (values: BlindMatchProfileInput) => void;
}) {
  const form = useForm<
    BlindMatchProfileFormValues,
    unknown,
    BlindMatchProfileInput
  >({
    resolver: zodResolver(blindMatchProfileSchema),
    defaultValues: {
      intent: data.profile?.intent ?? "CASUAL_DISCUSSION",
      preferredGenres: data.profile?.preferredGenres ?? [],
      discussionStyle: data.profile?.discussionStyle ?? "",
    },
  });

  const selectedGenres =
    useWatch({ control: form.control, name: "preferredGenres" }) ?? [];
  const discussionStyleValue =
    useWatch({ control: form.control, name: "discussionStyle" }) ?? "";
  const errors = form.formState.errors;
  const intentError = errorMessage(errors.intent?.message);
  const genreError = errorMessage(errors.preferredGenres?.message);
  const discussionError = errorMessage(errors.discussionStyle?.message);
  const genreLimitReached = selectedGenres.length >= 8;
  const formId = `blind-reading-${variant}-${submitLabel.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <form
      className={cn(
        "flex flex-col",
        stickySubmit ? "min-h-0 flex-1" : "gap-4",
        variant === "card" && "rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm",
      )}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          stickySubmit && "min-h-0 flex-1 overflow-y-auto px-5 pb-5",
        )}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-intent`}>Intensi</Label>
          <Controller
            control={form.control}
            name="intent"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                <SelectTrigger
                  id={`${formId}-intent`}
                  aria-describedby={intentError ? `${formId}-intent-error` : undefined}
                  aria-invalid={Boolean(intentError)}
                  className="w-full  px-4"
                >
                  <SelectValue placeholder="Pilih intensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(intentLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          {intentError ? (
            <p id={`${formId}-intent-error`} className="text-xs text-destructive" role="alert">
              {intentError}
            </p>
          ) : null}
        </div>

        <fieldset
          aria-describedby={`${formId}-taste-help${genreError ? ` ${formId}-taste-error` : ""}`}
          className="flex flex-col gap-2"
          disabled={disabled}
        >
          <legend className="text-sm font-medium">Taste</legend>
          <p id={`${formId}-taste-help`} className="text-xs text-muted-foreground">
            Maksimal 8 pilihan.
          </p>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((genre) => {
              const active = selectedGenres.includes(genre);
              const locked = !active && genreLimitReached;

              return (
                <label
                  key={genre}
                  className={cn(
                    "rounded-full",
                    locked || disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    value={genre}
                    className="peer sr-only"
                    disabled={locked || disabled}
                    {...form.register("preferredGenres")}
                  />
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40 peer-focus-visible:outline-none",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/70 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {genre}
                  </span>
                </label>
              );
            })}
          </div>
          {genreError ? (
            <p id={`${formId}-taste-error`} className="text-xs text-destructive" role="alert">
              {genreError}
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-discussion`}>Vibe ngobrol</Label>
          <Textarea
            id={`${formId}-discussion`}
            rows={3}
            maxLength={160}
            placeholder="Santai, deep talk, atau genre buddy."
            className="rounded-none ring-0! outline-none! shadow-none!  bg-background/60"
            disabled={disabled}
            aria-describedby={`${formId}-discussion-help`}
            aria-invalid={Boolean(discussionError)}
            {...form.register("discussionStyle")}
          />
          <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
            <p
              id={`${formId}-discussion-help`}
              className={cn(discussionError && "text-destructive")}
              role={discussionError ? "alert" : undefined}
            >
              {discussionError ?? "Opsional, singkat saja."}
            </p>
            <p className="shrink-0 tabular-nums">{discussionStyleValue.length}/160</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          stickySubmit &&
          "sticky bottom-0 mt-auto border-t border-border/60 bg-popover/95 p-5 supports-[backdrop-filter]:bg-popover/85",
        )}
      >
        <Button type="submit" className="w-full cursor-pointer rounded-full" disabled={disabled}>
          {pending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function BookshelfSheet({
  profile,
  trigger,
}: {
  profile: BlindMatchReaderProfile;
  trigger: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88vh] rounded-t-[2rem] p-0">
        <SheetHeader className="p-5 pb-2">
          <SheetTitle className="font-heading text-xl normal-case tracking-tight">
            Rak {profile.displayName}
          </SheetTitle>
          <SheetDescription>Data publik saja.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="max-h-[72vh] px-5 pb-5">
          <div className="flex flex-col gap-4">
            <BookSection title="Buku yang sama" books={profile.bookshelf.shared} />
            <BookSection title="Sedang dibaca" books={profile.bookshelf.currentlyReading} />
            <BookSection title="Rak terbaru" books={profile.bookshelf.recent} />
            {profile.latestReview ? (
              <ReaderNote title={`Review · ${profile.latestReview.bookTitle}`} body={profile.latestReview.body} />
            ) : null}
            {profile.favoriteQuote ? (
              <ReaderNote title={`Quote · ${profile.favoriteQuote.bookTitle}`} body={profile.favoriteQuote.quote} />
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function BookSection({ title, books }: { title: string; books: BlindMatchBookPreview[] }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
        <Badge variant="secondary">{books.length}</Badge>
      </div>
      {books.length > 0 ? (
        <div className="flex flex-col gap-2">
          {books.map((book) => (
            <BookLine key={book.id} book={book} showStatus />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-muted/35 p-3 text-sm text-muted-foreground">Belum ada.</p>
      )}
    </section>
  );
}

function BookLine({
  book,
  showStatus = false,
}: {
  book: BlindMatchBookPreview;
  showStatus?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-background/70 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
        {book.title.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{book.title}</p>
        <p className="truncate text-xs text-muted-foreground">{book.author}</p>
      </div>
      {showStatus ? <Badge variant="secondary">{bookStatusLabels[book.status]}</Badge> : null}
    </div>
  );
}

function ReaderNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-primary/5 p-4">
      <Badge variant="secondary" className="text-primary">
        {title}
      </Badge>
      <p className="mt-2 text-sm leading-6 text-foreground/80">{body}</p>
    </div>
  );
}

function preferredBooks(profile: BlindMatchReaderProfile) {
  if (profile.bookshelf.shared.length > 0) return profile.bookshelf.shared;
  if (profile.bookshelf.currentlyReading.length > 0) {
    return profile.bookshelf.currentlyReading;
  }
  if (profile.bookshelf.finished.length > 0) return profile.bookshelf.finished;
  return profile.bookshelf.recent;
}

function errorMessage(message: unknown) {
  return typeof message === "string" ? message : null;
}
