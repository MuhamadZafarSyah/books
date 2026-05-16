import { z } from "zod";

export const bookReviewFormSchema = z.object({
  rating: z
    .number({ message: "Rating wajib diisi." })
    .int()
    .min(1, "Rating minimal 1 bintang.")
    .max(5, "Rating maksimal 5 bintang."),
  body: z
    .string()
    .trim()
    .min(10, "Tulis review minimal 10 karakter.")
    .max(4000, "Review terlalu panjang."),
});

export type BookReviewFormValues = z.infer<typeof bookReviewFormSchema>;
