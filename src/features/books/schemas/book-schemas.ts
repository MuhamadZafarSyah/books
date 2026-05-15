import { z } from "zod";

const BOOK_SEARCH_SORTS = ["relevance", "new", "old"] as const;

export const bookSearchParamsSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    title: z.string().trim().max(120).optional(),
    author: z.string().trim().max(120).optional(),
    isbn: z.string().trim().max(32).optional(),
    subject: z.string().trim().max(80).optional(),
    language: z.string().trim().max(12).optional(),
    yearFrom: z.coerce.number().int().min(0).max(3000).optional(),
    yearTo: z.coerce.number().int().min(0).max(3000).optional(),
    publisher: z.string().trim().max(120).optional(),
    sort: z.enum(BOOK_SEARCH_SORTS).default("relevance"),
    page: z.coerce.number().int().min(1).max(100).default(1),
    limit: z.coerce.number().int().min(1).max(20).default(12),
  })
  .superRefine((data, ctx) => {
    const hasAny =
      Boolean(data.q) ||
      Boolean(data.title) ||
      Boolean(data.author) ||
      Boolean(data.isbn) ||
      Boolean(data.subject) ||
      Boolean(data.publisher);

    if (!hasAny) {
      ctx.addIssue({
        code: "custom",
        message:
          "Masukkan kata kunci pencarian, judul, penulis, ISBN, subject, atau publisher.",
        path: ["q"],
      });
      return;
    }

    if (data.q && data.q.length > 0 && data.q.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Kata kunci pencarian minimal 2 karakter.",
        path: ["q"],
      });
    }

    if (
      typeof data.yearFrom === "number" &&
      typeof data.yearTo === "number" &&
      data.yearFrom > data.yearTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Rentang tahun tidak valid.",
        path: ["yearFrom"],
      });
    }
  });

export type BookSearchParams = z.infer<typeof bookSearchParamsSchema>;

export const subjectBrowseParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(12),
  offset: z.coerce.number().int().min(0).max(1000).default(0),
});

export type SubjectBrowseParams = z.infer<typeof subjectBrowseParamsSchema>;

export const isbnPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/[^0-9Xx]/g, ""))
  .refine((value) => value.length === 10 || value.length === 13, {
    message: "ISBN harus 10 atau 13 karakter.",
  });

export const workIdPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/^\/?works\//i, ""))
  .refine((value) => /^OL\d+W$/i.test(value), {
    message: "Work ID Open Library tidak valid.",
  });

export const editionIdPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/^\/?books\//i, ""))
  .refine((value) => /^OL\d+M$/i.test(value), {
    message: "Edition ID Open Library tidak valid.",
  });

export const subjectPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value) => value.toLowerCase().replace(/\s+/g, "_"));
