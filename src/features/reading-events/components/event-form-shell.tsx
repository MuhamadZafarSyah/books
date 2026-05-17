import { getReadingEventForEdit } from "@/actions/reading-events";
import { EventForm } from "@/features/reading-events/components/event-form";

type EventFormShellProps =
  | { mode: "create" }
  | { mode: "edit"; eventId: string };

/**
 * Server Component shell untuk Event_Form (Requirement 8.1, 8.3, 10.2).
 *
 * Bertanggung jawab atas dua hal yang harus terjadi di sisi server:
 *   1. Memuat detail Event saat `mode === "edit"` lewat
 *      `getReadingEventForEdit`. Loader tersebut memanggil `requireAuth()`
 *      dan menolak (lempar `Error("Forbidden")`) jika pemanggil bukan Host
 *      sehingga ownership check terjadi sebelum form dirender (Requirement
 *      8.3, 10.3).
 *   2. Menyajikan heading + subhead Bahasa Indonesia tanpa boilerplate
 *      Card — sesuai aturan "Do not overuse Card" pada AGENTS.md — lalu
 *      mendelegasikan logika interaktif ke Client Component `EventForm`.
 *
 * Komponen ini sengaja menerima discriminated props yang sama dengan
 * `EventForm` agar wiring di route `page.tsx` cukup mengoper `mode` dan
 * (jika edit) `eventId` saja.
 */
export async function EventFormShell(props: EventFormShellProps) {
  const isEdit = props.mode === "edit";

  const heading = isEdit ? "Sunting agenda baca" : "Buat agenda baca";
  const subhead = isEdit
    ? "Perbarui detail agenda baca Anda."
    : "Bagikan rencana baca bersama dengan komunitas Shelfgram.";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h1>
        <p className="text-sm text-muted-foreground">{subhead}</p>
      </header>

      {props.mode === "edit" ? (
        <EventFormEditBody eventId={props.eventId} />
      ) : (
        <EventForm mode="create" />
      )}
    </div>
  );
}

/**
 * Server-only sub-shell yang memuat detail event untuk mode edit.
 *
 * Dipisah agar pemanggilan async ke `getReadingEventForEdit` tidak
 * menahan render heading: heading muncul segera, sedangkan body diisi
 * setelah loader selesai.
 */
async function EventFormEditBody({ eventId }: { eventId: string }) {
  const event = await getReadingEventForEdit(eventId);

  return (
    <EventForm
      mode="edit"
      eventId={event.id}
      defaultValues={{
        title: event.title,
        description: event.description,
        locationAddress: event.locationAddress,
        latitude: event.latitude,
        longitude: event.longitude,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        quota: event.quota,
        bookReferenceUrl: event.bookReferenceUrl,
      }}
    />
  );
}
