/**
 * Constants and helpers safe to import from client components. The
 * `prompt.ts` companion is server-only because it builds the full system
 * instruction with potentially sensitive context.
 */

export const REFUSAL_PHRASE = "Maaf, saya tidak mengerti mengenai hal tersebut";

const FALLBACK_UNAVAILABLE =
  "Maaf, diskusi buku sedang tidak tersedia. Coba lagi beberapa saat lagi.";

export function getFallbackUnavailableMessage() {
  return FALLBACK_UNAVAILABLE;
}
