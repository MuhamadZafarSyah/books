"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Eye,
  Heart,
  Loader2,
  LockKeyhole,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  SkipForward,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  bookmarkBlindInterest,
  generateBlindMatchCandidates,
  revealNextBlindChapter,
  saveBlindMatchProfile,
  setBlindMatchPaused,
  skipBlindCandidate,
  startBlindMatchChat,
} from "@/actions/blind-match";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  blindMatchProfileSchema,
  type BlindMatchProfileInput,
  type BlindMatchProfileFormValues,
} from "@/features/blind-match/schemas/blind-match-schemas";
import type {
  BlindMatchCandidateView,
  BlindMatchHomeData,
} from "@/features/blind-match/types";
import { cn } from "@/lib/utils";

type PendingAction =
  | "save-profile"
  | "generate"
  | "pause"
  | "resume"
  | `reveal:${string}`
  | `skip:${string}`
  | `interest:${string}`
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
  EVENT_BUDDY: "Buddy agenda/circle",
  SURPRISE_ME: "Random sefrekuensi",
} as const;

export function BlindMatchShell({ data }: { data: BlindMatchHomeData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const isPaused = data.profile?.status === "PAUSED";

  const runAction = (action: PendingAction, task: () => Promise<void>) => {
    setPendingAction(action);
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Aksi Blind Match gagal. Coba lagi sebentar.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 px-5 py-6 sm:px-7 lg:px-9">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(143,184,158,0.28),transparent_60%)] sm:block" />
        <div className="relative max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Blind Reading Match
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Kenalan lewat chapter, bukan foto profil dulu.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Temukan pembaca misterius berdasarkan rak, review, quote, circle,
            dan agenda. Identitas baru terbuka ketika kalian saling bookmark
            interest.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <aside className="space-y-4">
          <EligibilityPanel data={data} />
          <BlindMatchProfileForm
            data={data}
            disabled={isPending}
            pending={pendingAction === "save-profile"}
            onSubmit={(values) =>
              runAction("save-profile", async () => {
                await saveBlindMatchProfile(values);
                toast.success("Preferensi Blind Match disimpan.");
              })
            }
          />

          {data.profile ? (
            <div className="rounded-2xl border border-border/70 bg-card/45 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {isPaused ? "Matching dijeda" : "Matching aktif"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {isPaused
                      ? "Kandidat baru tidak akan dibuat sampai kamu aktifkan lagi."
                      : `${data.dailyRemaining} slot kandidat tersisa hari ini.`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer rounded-full"
                  disabled={isPending}
                  onClick={() =>
                    runAction(isPaused ? "resume" : "pause", async () => {
                      await setBlindMatchPaused(!isPaused);
                      toast.success(isPaused ? "Blind Match aktif lagi." : "Blind Match dijeda.");
                    })
                  }
                >
                  {pendingAction === "pause" || pendingAction === "resume" ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : isPaused ? (
                    <PlayCircle aria-hidden className="size-3.5" />
                  ) : (
                    <PauseCircle aria-hidden className="size-3.5" />
                  )}
                  {isPaused ? "Aktifkan" : "Jeda"}
                </Button>
              </div>
            </div>
          ) : null}
        </aside>

        <main className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/45 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Secret Chapter hari ini
              </h2>
              <p className="text-sm text-muted-foreground">
                Buka clue, bookmark interest, lalu tunggu mutual reveal.
              </p>
            </div>
            <Button
              type="button"
              className="cursor-pointer rounded-full"
              disabled={
                isPending ||
                !data.profile ||
                isPaused ||
                !data.eligibility.eligible ||
                data.dailyRemaining <= 0
              }
              onClick={() =>
                runAction("generate", async () => {
                  const count = await generateBlindMatchCandidates();
                  toast.success(
                    count > 0
                      ? `${count} kandidat misterius ditemukan.`
                      : "Belum ada kandidat baru yang cocok hari ini.",
                  );
                })
              }
            >
              {pendingAction === "generate" ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw aria-hidden className="size-3.5" />
              )}
              Cari match
            </Button>
          </div>

          {data.candidates.length === 0 ? (
            <BlindMatchEmptyState data={data} />
          ) : (
            <div className="grid gap-4">
              {data.candidates.map((candidate) => (
                <SecretChapterCard
                  key={candidate.id}
                  candidate={candidate}
                  pendingAction={pendingAction}
                  disabled={isPending}
                  onReveal={() =>
                    runAction(`reveal:${candidate.id}`, async () => {
                      await revealNextBlindChapter(candidate.id);
                    })
                  }
                  onSkip={() =>
                    runAction(`skip:${candidate.id}`, async () => {
                      await skipBlindCandidate(candidate.id);
                      toast.success("Kandidat dilewati tanpa notifikasi.");
                    })
                  }
                  onInterest={() =>
                    runAction(`interest:${candidate.id}`, async () => {
                      const mutual = await bookmarkBlindInterest(candidate.id);
                      toast.success(
                        mutual
                          ? "Mutual reveal terbuka!"
                          : "Interest tersimpan. Profil terbuka kalau dia juga tertarik.",
                      );
                    })
                  }
                  onStartChat={() =>
                    runAction(`chat:${candidate.id}`, async () => {
                      const conversationId = await startBlindMatchChat(candidate.id);
                      router.push(`/dashboard/chat?conversation=${conversationId}`);
                    })
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function EligibilityPanel({ data }: { data: BlindMatchHomeData }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/45 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Kesiapan match
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {data.eligibility.eligible
              ? "Data bacamu cukup untuk menemukan chemistry pembaca lain."
              : data.eligibility.missing[0]}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <MiniStat label="Rak" value={data.eligibility.shelfCount} />
            <MiniStat label="Review" value={data.eligibility.reviewCount} />
            <MiniStat label="Quote" value={data.eligibility.quoteCount} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/45 px-2 py-2">
      <p className="font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function BlindMatchProfileForm({
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

  return (
    <form
      className="space-y-4 rounded-2xl border border-border/70 bg-card/45 p-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Preferensi blind match
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih vibe agar sistem menilai interest dengan konteks yang tepat.
        </p>
      </div>

      <Controller
        control={form.control}
        name="intent"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger className="w-full rounded-2xl bg-background">
              <SelectValue placeholder="Pilih intensi" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(intentLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Interest tags
        </legend>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((genre) => {
            const active = selectedGenres.includes(genre);
            return (
              <label
                key={genre}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="checkbox"
                  value={genre}
                  className="sr-only"
                  {...form.register("preferredGenres")}
                />
                {genre}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Textarea
        rows={3}
        placeholder="Contoh: suka ngobrol santai tapi detail soal karakter dan ending."
        disabled={disabled}
        {...form.register("discussionStyle")}
      />

      <Button type="submit" className="w-full cursor-pointer rounded-full" disabled={disabled}>
        {pending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
        {data.profile ? "Simpan preferensi" : "Aktifkan Blind Match"}
      </Button>
    </form>
  );
}

function BlindMatchEmptyState({ data }: { data: BlindMatchHomeData }) {
  const copy = !data.profile
    ? "Aktifkan preferensi dulu agar sistem tahu tipe pembaca yang ingin kamu temui."
    : data.profile.status === "PAUSED"
      ? "Matching sedang dijeda. Aktifkan lagi kalau ingin menerima candidate baru."
      : !data.eligibility.eligible
        ? "Lengkapi sinyal baca agar chemistry yang dihitung tidak asal tebak."
        : "Belum ada Secret Chapter hari ini. Tekan Cari match untuk mencari kandidat.";

  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/35 px-6 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <LockKeyhole aria-hidden className="size-5" />
      </span>
      <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight">
        Belum ada chapter misterius
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {copy}
      </p>
    </div>
  );
}

function SecretChapterCard({
  candidate,
  pendingAction,
  disabled,
  onReveal,
  onSkip,
  onInterest,
  onStartChat,
}: {
  candidate: BlindMatchCandidateView;
  pendingAction: PendingAction;
  disabled: boolean;
  onReveal: () => void;
  onSkip: () => void;
  onInterest: () => void;
  onStartChat: () => void;
}) {
  const visibleCount = candidate.visibleClues.length;
  const canRevealMore = !candidate.isMutual && visibleCount < 3;

  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card/65">
      <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {candidate.isMutual ? (
              <UserRoundCheck aria-hidden className="size-3.5" />
            ) : (
              <LockKeyhole aria-hidden className="size-3.5" />
            )}
            {candidate.isMutual ? "Mutual reveal" : "Pembaca misterius"}
          </p>
          <h3 className="font-heading text-xl font-semibold tracking-tight">
            {candidate.revealedUser?.name ?? candidate.persona}
          </h3>
          <p className="text-sm text-muted-foreground">
            Compatibility {candidate.compatibilityScore}% · Chapter {visibleCount}/3
          </p>
        </div>

        {candidate.revealedUser ? (
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage src={candidate.revealedUser.image ?? undefined} alt={candidate.revealedUser.name ?? "Pembaca"} />
              <AvatarFallback>{getInitials(candidate.revealedUser.name, candidate.revealedUser.username)}</AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Sparkles aria-hidden className="size-5" />
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        {candidate.reasons.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {candidate.reasons.map((reason) => (
              <span key={reason.label} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {reason.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3">
          {candidate.visibleClues.map((clue) => (
            <div key={clue.stage} className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Chapter {clue.stage}
              </p>
              <h4 className="mt-1 font-medium text-foreground">{clue.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{clue.body}</p>
            </div>
          ))}
        </div>

        {candidate.revealedUser ? (
          <div className="rounded-2xl bg-primary/5 p-4 text-sm">
            <p className="font-medium text-foreground">
              @{candidate.revealedUser.username ?? candidate.revealedUser.slug}
            </p>
            {candidate.revealedUser.bio ? (
              <p className="mt-1 line-clamp-2 text-muted-foreground">{candidate.revealedUser.bio}</p>
            ) : null}
          </div>
        ) : candidate.status === "INTERESTED" ? (
          <div className="rounded-2xl bg-primary/5 p-4 text-sm text-primary">
            Interest sudah dikirim. Profil terbuka kalau dia juga bookmark kamu.
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {candidate.revealedUser ? (
            <>
              <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-full">
                <Link href={`/u/${candidate.revealedUser.slug}`}>
                  <Eye aria-hidden className="size-3.5" />
                  Lihat profil
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                className="cursor-pointer rounded-full"
                disabled={disabled}
                onClick={onStartChat}
              >
                {pendingAction === `chat:${candidate.id}` ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <MessageCircle aria-hidden className="size-3.5" />
                )}
                Mulai chat
              </Button>
            </>
          ) : (
            <>
              {canRevealMore ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer rounded-full"
                  disabled={disabled}
                  onClick={onReveal}
                >
                  {pendingAction === `reveal:${candidate.id}` ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    <Eye aria-hidden className="size-3.5" />
                  )}
                  Buka chapter
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="cursor-pointer rounded-full"
                disabled={disabled || !candidate.canBookmarkInterest}
                onClick={onInterest}
              >
                {pendingAction === `interest:${candidate.id}` ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <Heart aria-hidden className="size-3.5" />
                )}
                Bookmark interest
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer rounded-full"
                disabled={disabled}
                onClick={onSkip}
              >
                {pendingAction === `skip:${candidate.id}` ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <SkipForward aria-hidden className="size-3.5" />
                )}
                Skip
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function getInitials(name: string | null, username: string | null) {
  const source = name ?? username ?? "Pembaca";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return (parts[0] ?? "P").slice(0, 2).toUpperCase();
}
