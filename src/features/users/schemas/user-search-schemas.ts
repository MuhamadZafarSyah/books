import { z } from "zod";

import { USER_SEARCH_MAX_QUERY_LENGTH } from "@/features/users/search-constants";

export const userSearchParamsSchema = z.object({
  q: z.string().trim().max(USER_SEARCH_MAX_QUERY_LENGTH).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

export type UserSearchParams = z.infer<typeof userSearchParamsSchema>;
