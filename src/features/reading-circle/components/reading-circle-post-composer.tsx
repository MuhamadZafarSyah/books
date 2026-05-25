"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { createReadingCirclePost } from "@/actions/reading-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ReadingCircleDetail,
  ReadingCircleSpoilerLevel,
} from "@/features/reading-circle/types";

type ReadingCirclePostComposerProps = {
  circleId: string;
  onPosted: (next: ReadingCircleDetail) => void;
  /**
   * `card` (default) wraps the composer in its own bordered card with a
   * heading. `dialog` removes the wrapper so the surrounding dialog header
   * provides the framing instead.
   */
  variant?: "card" | "dialog";
};

const SPOILER_OPTIONS: Array<{
  value: ReadingCircleSpoilerLevel;
  label: string;
}> = [
  { value: "NONE", label: "Tanpa spoiler" },
  { value: "CHAPTER_RANGE", label: "Spoiler bab" },
  { value: "MAJOR", label: "Spoiler besar" },
  { value: "ENDING", label: "Spoiler ending" },
];

export function ReadingCirclePostComposer({
  circleId,
  onPosted,
  variant = "card",
}: ReadingCirclePostComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spoilerLevel, setSpoilerLevel] = useState<ReadingCircleSpoilerLevel>("NONE");
  const [chapterFrom, setChapterFrom] = useState("");
  const [chapterTo, setChapterTo] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      toast.error("Isi diskusi dulu sebelum kirim.");
      return;
    }
    startTransition(async () => {
      try {
        const next = await createReadingCirclePost(circleId, {
          title: title.trim() || null,
          body: trimmedBody,
          spoilerLevel,
          spoilerFromChapter: chapterFrom ? Number(chapterFrom) : null,
          spoilerToChapter: chapterTo ? Number(chapterTo) : null,
        });
        onPosted(next);
        setTitle("");
        setBody("");
        setSpoilerLevel("NONE");
        setChapterFrom("");
        setChapterTo("");
        toast.success("Diskusi dipublikasikan.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal kirim diskusi.",
        );
      }
    });
  };

  const isCard = variant === "card";

  return (
    <section
      className={
        isCard
          ? "rounded-2xl border border-border bg-card/80 p-4 shadow-sm"
          : ""
      }
    >
      {isCard && (
        <>
          <h2 className="font-heading text-sm font-semibold tracking-tight">
            Mulai diskusi baru
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bagikan pertanyaan, refleksi, atau highlight tentang buku.
          </p>
        </>
      )}

      <div className={isCard ? "mt-3 space-y-3" : "space-y-3"}>
        <Input
          placeholder="Judul (opsional)"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
        />
        <Textarea
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Tulis pemikiran Anda..."
          className="min-h-[6rem] rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          maxLength={4000}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-[10px] tracking-[0.18em] text-muted-foreground">
              Spoiler
            </Label>
            <Select
              value={spoilerLevel}
              onValueChange={(value) =>
                setSpoilerLevel(value as ReadingCircleSpoilerLevel)
              }
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Pilih spoiler" />
              </SelectTrigger>
              <SelectContent position="popper">
                {SPOILER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.18em] text-muted-foreground">
              Bab dari
            </Label>
            <Input
              inputMode="numeric"
              placeholder="1"
              value={chapterFrom}
              onChange={(event) =>
                setChapterFrom(event.target.value.replace(/[^0-9]/g, "").slice(0, 5))
              }
            />
          </div>
          <div>
            <Label className="text-[10px] tracking-[0.18em] text-muted-foreground">
              Bab sampai
            </Label>
            <Input
              inputMode="numeric"
              placeholder="3"
              value={chapterTo}
              onChange={(event) =>
                setChapterTo(event.target.value.replace(/[^0-9]/g, "").slice(0, 5))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-muted-foreground">
            {body.length}/4000
          </span>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending || body.trim().length === 0}
            className="cursor-pointer rounded-full"
          >
            <Send aria-hidden="true" className="size-3.5" />
            Kirim diskusi
          </Button>
        </div>
      </div>
    </section>
  );
}
