export type BookQuoteSummary = {
  id: string;
  quote: string;
  note: string | null;
  page: number | null;
  chapter: string | null;
  visibility: "PRIVATE" | "FOLLOWERS" | "PUBLIC";
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
};
