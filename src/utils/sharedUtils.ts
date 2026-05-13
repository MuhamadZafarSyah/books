export function formatJoinedAt(value?: string | Date | null) {
  if (!value) return "Januari 2025";

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
