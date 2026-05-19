/**
 * Helper format ringkas yang dipakai oleh komponen Beranda dan Profil.
 *
 * Konstanta formatter dibuat di module-scope agar tidak rebuild setiap render.
 */

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID");

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("id-ID", {
  numeric: "auto",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

/**
 * Format relatif kompak: "5 menit lalu", "2 jam lalu", "kemarin", dst.
 *
 * Untuk durasi > 7 hari kita kembali ke tanggal absolut singkat agar tetap
 * informatif tanpa terasa "menggantung".
 */
export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return RELATIVE_FORMATTER.format(Math.round(diffSeconds), "second");
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_FORMATTER.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return RELATIVE_FORMATTER.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return RELATIVE_FORMATTER.format(diffDays, "day");
  }
  return DATE_SHORT_FORMATTER.format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}

export function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_SHORT_FORMATTER.format(date);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "P").toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}
