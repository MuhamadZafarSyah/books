import Link from "next/link";
import { Plus } from "lucide-react";

import { getReadingEventsListPage } from "@/actions/reading-events";
import { Button } from "@/components/ui/button";
import { EventListClient } from "@/features/reading-events/components/event-list-client";

/**
 * Server Component shell untuk Event_List_View (Requirement 3.1, 3.6, 10.2).
 *
 * Tanggung jawab yang harus terjadi di sisi server:
 *   1. Memuat halaman pertama daftar Event lewat `getReadingEventsListPage`
 *      (page 1, tanpa query, tanpa filter `onlyJoinable`). Loader tersebut
 *      memanggil `requireAuth()` sehingga otentikasi terjamin sebelum data
 *      direnders (Requirement 10.2).
 *   2. Menyajikan heading + subhead Bahasa Indonesia dan tombol "Buat
 *      agenda" yang me-link ke `/dashboard/events/new` tanpa boilerplate
 *      Card — sesuai aturan "Do not overuse Card" pada AGENTS.md.
 *   3. Mendelegasikan semua interaksi (search, filter, pagination) ke Client
 *      Component `EventListClient` dengan `initialPageData` agar render
 *      pertama langsung tampil tanpa skeleton.
 */
export async function EventListShell() {
  const initialPageData = await getReadingEventsListPage({
    page: 1,
    q: undefined,
    onlyJoinable: false,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Agenda Baca
          </h1>
          <p className="text-sm text-muted-foreground">
            Temukan agenda baca bersama dari komunitas Shelfgram dan ikut
            serta.
          </p>
        </div>

        <Button asChild size="sm" className="cursor-pointer">
          <Link href="/dashboard/events/new">
            <Plus aria-hidden="true" className="size-3.5" />
            Buat agenda
          </Link>
        </Button>
      </header>

      <EventListClient initialPageData={initialPageData} />
    </div>
  );
}
