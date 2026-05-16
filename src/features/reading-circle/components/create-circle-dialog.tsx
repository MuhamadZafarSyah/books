"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

import {
  createReadingCircleFromBook,
} from "@/actions/reading-circle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookResult } from "@/features/books/types";
import type { ReadingCirclePrivacy } from "@/features/reading-circle/types";

type CreateCircleDialogProps = {
  book: BookResult;
};

export function CreateCircleDialog({ book }: CreateCircleDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(() => `Diskusi ${book.title}`.slice(0, 120));
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<ReadingCirclePrivacy>("PUBLIC");
  const [targetLabel, setTargetLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Reset form to defaults whenever the dialog opens. Doing this in
      // the open transition avoids the React 19 lint rule against
      // setState-in-effect.
      setTitle(`Diskusi ${book.title}`.slice(0, 120));
      setDescription("");
      setTargetLabel("");
      setPrivacy("PUBLIC");
    }
    setOpen(next);
  };

  const submit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Judul circle wajib diisi.");
      return;
    }
    startTransition(async () => {
      try {
        const { circleId } = await createReadingCircleFromBook(book, {
          title: trimmedTitle,
          description: description.trim() || null,
          privacy,
          targetLabel: targetLabel.trim() || null,
        });
        toast.success("Circle berhasil dibuat.");
        setOpen(false);
        router.push(`/dashboard/circles/${circleId}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal membuat circle.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full cursor-pointer rounded-full"
        onClick={() => handleOpenChange(true)}
      >
        <Users aria-hidden="true" className="size-3.5" />
        Buat Circle
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat reading circle</DialogTitle>
          <DialogDescription>
            Buat ruang diskusi komunitas untuk {book.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rc-title" className="text-[10px] tracking-[0.18em]">
              Judul circle
            </Label>
            <Input
              id="rc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Buddy read tema musim panas"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rc-desc" className="text-[10px] tracking-[0.18em]">
              Deskripsi singkat (opsional)
            </Label>
            <textarea
              id="rc-desc"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="Apa yang ingin dibahas di circle ini?"
              className="min-h-[5rem] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-[10px] tracking-[0.18em]">Privasi</Label>
            <Select
              value={privacy}
              onValueChange={(value) => setPrivacy(value as ReadingCirclePrivacy)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih privasi" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="PUBLIC">Publik — siapa pun bisa join</SelectItem>
                <SelectItem value="UNLISTED">
                  Unlisted — hanya via link
                </SelectItem>
                <SelectItem value="PRIVATE">
                  Privat — hanya undangan
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rc-target" className="text-[10px] tracking-[0.18em]">
              Target awal (opsional)
            </Label>
            <Input
              id="rc-target"
              value={targetLabel}
              onChange={(event) => setTargetLabel(event.target.value)}
              maxLength={80}
              placeholder="Minggu 1 · Bab 1-3"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full"
              disabled={pending}
            >
              Batal
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending || title.trim().length === 0}
            className="cursor-pointer rounded-full"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Users aria-hidden="true" className="size-3.5" />
            )}
            {pending ? "Membuat..." : "Buat circle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}