import { z } from "zod";

export const userSearchParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

export type UserSearchParams = z.infer<typeof userSearchParamsSchema>;
