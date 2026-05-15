/**
 * Stable internal shape for a book exposed to the UI.
 * Decoupled from raw Open Library payloads so the client never depends on
 * upstream field names.
 */
export type BookResult = {
  id: string;
  workKey: string | null;
  editionKey: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  authorText: string;
  coverUrl: string | null;
  firstPublishYear: number | null;
  publishDate: string | null;
  isbn10: string | null;
  isbn13: string | null;
  languages: string[];
  publishers: string[];
  subjects: string[];
  pageCount: number | null;
  description: string | null;
  openLibraryUrl?: string;
};

export type BookSearchResponse = {
  query: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  results: BookResult[];
};

export type BookErrorResponse = {
  error: string;
};
