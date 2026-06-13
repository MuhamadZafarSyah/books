import { z } from "zod";

export const BLIND_MATCH_INTENTS = [
  "CASUAL_DISCUSSION",
  "GENRE_BUDDY",
  "EVENT_BUDDY",
  "SURPRISE_ME",
] as const;

export const blindMatchProfileSchema = z.object({
  intent: z.enum(BLIND_MATCH_INTENTS),
  preferredGenres: z
    .array(z.string().trim().min(1).max(32))
    .max(8, "Pilih maksimal 8 taste.")
    .default([]),
  discussionStyle: z
    .string()
    .trim()
    .max(160, "Vibe ngobrol maksimal 160 karakter.")
    .optional()
    .default(""),
});

export const blindMatchCandidateIdSchema = z.object({
  candidateId: z.string().min(1),
});

export type BlindMatchProfileInput = z.output<typeof blindMatchProfileSchema>;
export type BlindMatchProfileFormValues = z.input<typeof blindMatchProfileSchema>;
