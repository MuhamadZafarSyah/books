import type { Book, BookReview } from "@prisma/client";

import { profileSlugFor } from "@/lib/public-profile";
import type {
  BookReviewBookContext,
  BookReviewSummary,
  BookReviewVisibility,
} from "@/features/book-reviews/types";

type AuthorShape = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
};

export function serializeBookReview(
  review: BookReview & { user: AuthorShape },
): BookReviewSummary {
  return {
    id: review.id,
    rating: review.rating ?? null,
    body: review.body,
    visibility: review.visibility as BookReviewVisibility,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    user: {
      id: review.user.id,
      name: review.user.name,
      username: review.user.username,
      image: review.user.image,
      slug: profileSlugFor({
        id: review.user.id,
        username: review.user.username,
        name: review.user.name,
        email: review.user.email,
      }),
    },
  };
}

export function serializeBookContext(book: Book): BookReviewBookContext {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl ?? null,
    description: book.description ?? null,
    openLibraryUrl: book.openLibraryUrl ?? null,
    firstPublishYear: book.firstPublishYear ?? null,
  };
}
