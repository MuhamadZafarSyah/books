import Link from "next/link";
import { MessageSquarePlus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResizableShell } from "@/components/ui/resizable-shell";
import { ReadingCircleHistoryDrawer } from "@/features/reading-circle/components/reading-circle-history-drawer";
import { ReadingCircleRoom } from "@/features/reading-circle/components/reading-circle-room";
import { ReadingCircleSidebar } from "@/features/reading-circle/components/reading-circle-sidebar";
import type { ReadingCircleBootstrap } from "@/features/reading-circle/types";

type ReadingCircleShellProps = {
  data: ReadingCircleBootstrap;
};

export function ReadingCircleShell({ data }: ReadingCircleShellProps) {
  const { circle, history } = data;
  const activeCircleId = circle?.id ?? null;

  const sidebar = (
    <ReadingCircleSidebar history={history} activeCircleId={activeCircleId} />
  );

  const main = circle ? (
    <ReadingCircleRoom initial={circle} history={history} />
  ) : (
    <EmptyMainPanel history={history} activeCircleId={activeCircleId} />
  );

  return (
    <ResizableShell
      storageKey="reading-circle-shell"
      sidebar={sidebar}
      className="overflow-x-hidden"
      main={main}
      defaultSidebarSize={22}
      minSidebarSize={0}
      maxSidebarSize={280}
    />
  );
}

function EmptyMainPanel({
  history,
  activeCircleId,
}: {
  history: ReadingCircleBootstrap["history"];
  activeCircleId: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex relative justify-between items-center">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles aria-hidden="true" className="size-3" />
              Reading Circle
            </span>
            <div className="absolute -top-2 -right-2">
              <ReadingCircleHistoryDrawer
                history={history}
                activeCircleId={activeCircleId}
              />
            </div>
          </div>
          <h1 className="mt-1 font-heading text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            Pilih circle
          </h1>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {history.length > 0
              ? "Buka salah satu circle dari daftar di samping."
              : "Belum ada circle. Mulai dari halaman Jelajahi."}
          </p>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight">
            {history.length > 0
              ? "Belum ada circle yang dipilih"
              : "Buat circle pertama Anda"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {history.length > 0
              ? "Pilih circle dari panel history untuk melanjutkan diskusi, atau buka halaman Jelajahi untuk membuat circle baru."
              : "Cari buku di halaman Jelajahi, lalu tekan tombol \"Buat Circle\" untuk membuka diskusi komunitas."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm" className="cursor-pointer rounded-full">
              <Link href="/dashboard/explore">
                <MessageSquarePlus aria-hidden="true" className="size-3.5" />
                {history.length > 0 ? "Circle baru" : "Mulai dari Jelajahi"}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="cursor-pointer rounded-full"
            >
              <Link href="/dashboard/circles/discover">
                Discover circle
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
