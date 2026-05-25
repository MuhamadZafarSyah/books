"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;

type BookAiChatComposerProps = {
  onSubmit: (message: string) => Promise<void> | void;
  disabled?: boolean;
  pending?: boolean;
};

export function BookAiChatComposer({
  onSubmit,
  disabled = false,
  pending = false,
}: BookAiChatComposerProps) {
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const tooLong = value.length > MAX_LENGTH;
  const canSend = !disabled && !pending && trimmed.length > 0 && !tooLong;

  const submit = async () => {
    if (!canSend) return;
    const next = trimmed;
    setValue("");
    await onSubmit(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card px-4 py-3 sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div
          className={cn(
            "flex flex-1 items-end gap-2 rounded-2xl border border-input bg-background px-3 py-2 transition-colors",
            tooLong && "border-destructive",
          )}
        >
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan tentang buku ini..."
            rows={1}
            disabled={disabled}
            aria-label="Pesan untuk AI"
            className="min-h-6 flex-1 rounded-none border-0 bg-transparent p-0 text-sm leading-6 placeholder:text-muted-foreground/80 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span
            className={cn(
              "shrink-0 self-end pb-1 text-[10px]",
              tooLong ? "text-destructive" : "text-muted-foreground/70",
            )}
            aria-live="polite"
          >
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
        <Button
          type="submit"
          size="icon"
          className="cursor-pointer rounded-2xl"
          disabled={!canSend}
          aria-label="Kirim pesan"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-[10px] text-muted-foreground/70">
        Tekan Enter untuk kirim, Shift+Enter untuk baris baru.
      </p>
    </form>
  );
}
