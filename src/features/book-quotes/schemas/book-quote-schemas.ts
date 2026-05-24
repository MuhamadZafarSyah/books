import { z } from "zod";

export const bookQuoteSchema = z.object({
  quote: z.string().trim().min(3, "Kutipan minimal 3 karakter.").max(1000, "Kutipan maksimal 1000 karakter."),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  page: z.string().optional().or(z.literal("")),
  chapter: z.string().trim().max(120).optional().or(z.literal("")),
  visibility: z.enum(["PRIVATE", "FOLLOWERS", "PUBLIC"]),
  isFavorite: z.boolean(),
});

export type BookQuoteFormValues = z.infer<typeof bookQuoteSchema>;
