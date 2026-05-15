import "server-only";

import type { BookResult, BookSearchResponse } from "@/features/books/types";
import type {
  BookSearchParams,
  SubjectBrowseParams,
} from "@/features/books/schemas/book-schemas";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";
const COVER_BASE = "https://covers.openlibrary.org";
const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "first_publish_year",
  "cover_i",
  "isbn",
  "edition_key",
  "language",
  "publisher",
  "subject",
  "number_of_pages_median",
].join(",");

const SEARCH_REVALIDATE_SECONDS = 300;
const DETAIL_REVALIDATE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 8000;
const SUBJECTS_LIMIT = 10;
const PUBLISHERS_LIMIT = 5;

const COVER_SIZE_MAP = { S: "S", M: "M", L: "L" } as const;
type CoverSize = keyof typeof COVER_SIZE_MAP;

export class OpenLibraryError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OpenLibraryError";
    this.status = status;
  }
}

function dedupeStrings(values: ReadonlyArray<unknown> | undefined | null) {
  if (!Array.isArray(values)) return [] as string[];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function pickStringNumber(value: unknown, fallback: number | null = null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function stripEditionPrefix(key: string | null | undefined) {
  if (!key) return null;
  const parts = key.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function findIsbn(values: string[] | undefined, length: 10 | 13) {
  if (!Array.isArray(values)) return null;
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const cleaned = raw.replace(/[^0-9Xx]/g, "");
    if (cleaned.length === length) return cleaned;
  }
  return null;
}

function safeOpenLibraryUrl(workKey: string | null, editionKey: string | null) {
  if (workKey) return `${OPEN_LIBRARY_BASE}${workKey}`;
  if (editionKey) return `${OPEN_LIBRARY_BASE}/books/${editionKey}`;
  return OPEN_LIBRARY_BASE;
}

export function buildOpenLibraryCoverUrl(
  identifier: number | string | null | undefined,
  size: CoverSize = "M",
  type: "id" | "olid" | "isbn" = "id",
) {
  if (identifier === null || identifier === undefined || identifier === "") {
    return null;
  }
  return `${COVER_BASE}/b/${type}/${identifier}-${COVER_SIZE_MAP[size]}.jpg?default=false`;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Shelfgram/1.0 (https://shelfgram.app)",
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 404) {
      throw new OpenLibraryError("Resource not found", 404);
    }

    if (!response.ok) {
      throw new OpenLibraryError(
        `Open Library responded with ${response.status}`,
        502,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof OpenLibraryError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new OpenLibraryError("Open Library request timed out", 504);
    }
    throw new OpenLibraryError("Failed to reach Open Library", 502);
  } finally {
    clearTimeout(timeout);
  }
}

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  edition_key?: string[];
  language?: string[];
  publisher?: string[];
  subject?: string[];
  number_of_pages_median?: number;
};

type OpenLibrarySearchPayload = {
  numFound?: number;
  num_found?: number;
  start?: number;
  docs?: OpenLibrarySearchDoc[];
};

function normalizeSearchDoc(doc: OpenLibrarySearchDoc): BookResult {
  const authors = dedupeStrings(doc.author_name);
  const subjects = dedupeStrings(doc.subject).slice(0, SUBJECTS_LIMIT);
  const publishers = dedupeStrings(doc.publisher).slice(0, PUBLISHERS_LIMIT);
  const languages = dedupeStrings(doc.language);
  const editionKey = doc.edition_key?.[0] ?? null;
  const workKey = typeof doc.key === "string" ? doc.key : null;
  const coverUrl =
    typeof doc.cover_i === "number"
      ? buildOpenLibraryCoverUrl(doc.cover_i, "M", "id")
      : editionKey
        ? buildOpenLibraryCoverUrl(editionKey, "M", "olid")
        : null;

  const title = (doc.title ?? "").trim() || "Untitled book";
  const subtitle = doc.subtitle?.trim() || null;

  return {
    id: workKey ?? editionKey ?? title,
    workKey,
    editionKey,
    title,
    subtitle,
    authors,
    authorText:
      authors.length > 0 ? authors.join(", ") : "Penulis tidak diketahui",
    coverUrl,
    firstPublishYear: pickStringNumber(doc.first_publish_year),
    publishDate: null,
    isbn10: findIsbn(doc.isbn, 10),
    isbn13: findIsbn(doc.isbn, 13),
    languages,
    publishers,
    subjects,
    pageCount: pickStringNumber(doc.number_of_pages_median),
    description: null,
    openLibraryUrl: safeOpenLibraryUrl(workKey, editionKey),
  };
}

function buildSearchUrl(params: BookSearchParams) {
  const search = new URLSearchParams();
  search.set("fields", SEARCH_FIELDS);
  search.set("limit", String(params.limit));
  search.set("page", String(params.page));

  if (params.q) search.set("q", params.q);
  if (params.title) search.set("title", params.title);
  if (params.author) search.set("author", params.author);
  if (params.isbn) {
    const cleanIsbn = params.isbn.replace(/[^0-9Xx]/g, "");
    if (cleanIsbn) search.set("isbn", cleanIsbn);
  }
  if (params.subject) search.set("subject", params.subject);
  if (params.language) search.set("language", params.language);
  if (params.publisher) search.set("publisher", params.publisher);
  if (params.sort && params.sort !== "relevance") {
    search.set("sort", params.sort);
  }

  return `${OPEN_LIBRARY_BASE}/search.json?${search.toString()}`;
}

function applyYearFilter(
  results: BookResult[],
  yearFrom?: number,
  yearTo?: number,
) {
  if (typeof yearFrom !== "number" && typeof yearTo !== "number")
    return results;
  return results.filter((book) => {
    if (book.firstPublishYear === null) return false;
    if (typeof yearFrom === "number" && book.firstPublishYear < yearFrom)
      return false;
    if (typeof yearTo === "number" && book.firstPublishYear > yearTo)
      return false;
    return true;
  });
}

export async function searchOpenLibraryBooks(
  params: BookSearchParams,
): Promise<BookSearchResponse> {
  const url = buildSearchUrl(params);
  const payload = await fetchJson<OpenLibrarySearchPayload>(url, {
    next: { revalidate: SEARCH_REVALIDATE_SECONDS },
  });

  const docs = Array.isArray(payload.docs) ? payload.docs : [];
  const normalized = docs.map(normalizeSearchDoc);
  const filtered = applyYearFilter(normalized, params.yearFrom, params.yearTo);

  const total = pickStringNumber(payload.numFound ?? payload.num_found, 0) ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / params.limit) : 0;

  const queryLabel = [
    params.q,
    params.title && `title:${params.title}`,
    params.author && `author:${params.author}`,
    params.isbn && `isbn:${params.isbn}`,
    params.subject && `subject:${params.subject}`,
    params.publisher && `publisher:${params.publisher}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    query: queryLabel,
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    results: filtered,
  };
}

type OpenLibraryAuthorRef = {
  author?: { key?: string };
  type?: { key?: string };
};

type OpenLibraryWorkPayload = {
  key?: string;
  title?: string;
  subtitle?: string;
  description?: string | { value?: string };
  covers?: number[];
  subjects?: string[];
  authors?: OpenLibraryAuthorRef[];
  first_publish_date?: string;
};

type OpenLibraryAuthorPayload = {
  name?: string;
};

type OpenLibraryEditionPayload = {
  key?: string;
  title?: string;
  subtitle?: string;
  works?: { key?: string }[];
  authors?: { key?: string }[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  pagination?: string;
  isbn_10?: string[];
  isbn_13?: string[];
  languages?: { key?: string }[];
  subjects?: string[];
  covers?: number[];
  description?: string | { value?: string };
};

function descriptionToString(
  description: OpenLibraryWorkPayload["description"],
) {
  if (!description) return null;
  if (typeof description === "string") return description.trim() || null;
  if (typeof description.value === "string") {
    return description.value.trim() || null;
  }
  return null;
}

async function resolveAuthorNames(
  authorKeys: ReadonlyArray<string>,
): Promise<string[]> {
  if (authorKeys.length === 0) return [];

  const names = await Promise.all(
    authorKeys.slice(0, 6).map(async (key) => {
      try {
        const data = await fetchJson<OpenLibraryAuthorPayload>(
          `${OPEN_LIBRARY_BASE}${key}.json`,
          { next: { revalidate: DETAIL_REVALIDATE_SECONDS } },
        );
        return typeof data.name === "string" ? data.name.trim() : "";
      } catch {
        return "";
      }
    }),
  );

  return dedupeStrings(names);
}

function languageKeyToCode(key?: string) {
  if (!key) return null;
  const parts = key.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function getOpenLibraryWork(
  workId: string,
): Promise<BookResult | null> {
  const cleanId = workId.replace(/^\/?works\//i, "");
  if (!cleanId) return null;

  let work: OpenLibraryWorkPayload;
  try {
    work = await fetchJson<OpenLibraryWorkPayload>(
      `${OPEN_LIBRARY_BASE}/works/${cleanId}.json`,
      { next: { revalidate: DETAIL_REVALIDATE_SECONDS } },
    );
  } catch (error) {
    if (error instanceof OpenLibraryError && error.status === 404) return null;
    throw error;
  }

  const workKey = work.key ?? `/works/${cleanId}`;
  const authorKeys = (work.authors ?? [])
    .map((entry) => entry.author?.key)
    .filter((key): key is string => typeof key === "string");
  const authors = await resolveAuthorNames(authorKeys);

  const cover = Array.isArray(work.covers) ? (work.covers[0] ?? null) : null;
  const coverUrl =
    typeof cover === "number"
      ? buildOpenLibraryCoverUrl(cover, "L", "id")
      : null;

  const subjects = dedupeStrings(work.subjects).slice(0, SUBJECTS_LIMIT);
  const description = descriptionToString(work.description);
  const title = (work.title ?? "").trim() || "Untitled book";
  const subtitle = work.subtitle?.trim() || null;

  return {
    id: workKey,
    workKey,
    editionKey: null,
    title,
    subtitle,
    authors,
    authorText:
      authors.length > 0 ? authors.join(", ") : "Penulis tidak diketahui",
    coverUrl,
    firstPublishYear: parsePublishYear(work.first_publish_date),
    publishDate: work.first_publish_date?.trim() || null,
    isbn10: null,
    isbn13: null,
    languages: [],
    publishers: [],
    subjects,
    pageCount: null,
    description,
    openLibraryUrl: safeOpenLibraryUrl(workKey, null),
  };
}

function parsePublishYear(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/(\d{4})/);
  if (!match) return null;
  const year = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(year) ? year : null;
}

export async function getOpenLibraryEdition(
  editionId: string,
): Promise<BookResult | null> {
  const cleanId = editionId.replace(/^\/?books\//i, "");
  if (!cleanId) return null;

  let edition: OpenLibraryEditionPayload;
  try {
    edition = await fetchJson<OpenLibraryEditionPayload>(
      `${OPEN_LIBRARY_BASE}/books/${cleanId}.json`,
      { next: { revalidate: DETAIL_REVALIDATE_SECONDS } },
    );
  } catch (error) {
    if (error instanceof OpenLibraryError && error.status === 404) return null;
    throw error;
  }

  const editionKey = stripEditionPrefix(edition.key) ?? cleanId;
  const workKey = edition.works?.[0]?.key ?? null;

  const authorKeys = (edition.authors ?? [])
    .map((entry) => entry.key)
    .filter((key): key is string => typeof key === "string");
  const authors = await resolveAuthorNames(authorKeys);

  const cover = Array.isArray(edition.covers)
    ? (edition.covers[0] ?? null)
    : null;
  const coverUrl =
    typeof cover === "number"
      ? buildOpenLibraryCoverUrl(cover, "L", "id")
      : buildOpenLibraryCoverUrl(editionKey, "L", "olid");

  const isbn10 =
    findIsbn(edition.isbn_10, 10) ??
    findIsbn(
      edition.isbn_10?.map((value) => value),
      10,
    );
  const isbn13 =
    findIsbn(edition.isbn_13, 13) ??
    findIsbn(
      edition.isbn_13?.map((value) => value),
      13,
    );

  const publishers = dedupeStrings(edition.publishers).slice(
    0,
    PUBLISHERS_LIMIT,
  );
  const subjects = dedupeStrings(edition.subjects).slice(0, SUBJECTS_LIMIT);
  const languages = dedupeStrings(
    (edition.languages ?? [])
      .map((entry) => languageKeyToCode(entry.key))
      .filter((value): value is string => typeof value === "string"),
  );
  const description = descriptionToString(edition.description);

  const pageCount =
    pickStringNumber(edition.number_of_pages) ??
    pickStringNumber(edition.pagination);

  const title = (edition.title ?? "").trim() || "Untitled book";
  const subtitle = edition.subtitle?.trim() || null;

  return {
    id: workKey ?? `/books/${editionKey}`,
    workKey,
    editionKey,
    title,
    subtitle,
    authors,
    authorText:
      authors.length > 0 ? authors.join(", ") : "Penulis tidak diketahui",
    coverUrl,
    firstPublishYear: parsePublishYear(edition.publish_date),
    publishDate: edition.publish_date?.trim() || null,
    isbn10,
    isbn13,
    languages,
    publishers,
    subjects,
    pageCount,
    description,
    openLibraryUrl: safeOpenLibraryUrl(workKey, editionKey),
  };
}

export async function getOpenLibraryIsbn(
  isbn: string,
): Promise<BookResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (!clean) return null;

  let edition: OpenLibraryEditionPayload;
  try {
    edition = await fetchJson<OpenLibraryEditionPayload>(
      `${OPEN_LIBRARY_BASE}/isbn/${clean}.json`,
      { next: { revalidate: DETAIL_REVALIDATE_SECONDS } },
    );
  } catch (error) {
    if (error instanceof OpenLibraryError && error.status === 404) return null;
    throw error;
  }

  const editionKey = stripEditionPrefix(edition.key);
  if (!editionKey) return null;
  return getOpenLibraryEdition(editionKey);
}

type OpenLibrarySubjectWork = {
  key?: string;
  title?: string;
  subtitle?: string;
  authors?: { key?: string; name?: string }[];
  cover_id?: number;
  cover_edition_key?: string;
  edition_count?: number;
  first_publish_year?: number;
  ia?: string[];
  subject?: string[];
};

type OpenLibrarySubjectPayload = {
  name?: string;
  work_count?: number;
  works?: OpenLibrarySubjectWork[];
};

function normalizeSubjectWork(work: OpenLibrarySubjectWork): BookResult {
  const authors = dedupeStrings(
    (work.authors ?? [])
      .map((entry) => entry.name)
      .filter((value): value is string => typeof value === "string"),
  );
  const workKey = typeof work.key === "string" ? work.key : null;
  const editionKey = work.cover_edition_key ?? null;
  const coverUrl =
    typeof work.cover_id === "number"
      ? buildOpenLibraryCoverUrl(work.cover_id, "M", "id")
      : editionKey
        ? buildOpenLibraryCoverUrl(editionKey, "M", "olid")
        : null;

  const title = (work.title ?? "").trim() || "Untitled book";
  const subtitle = work.subtitle?.trim() || null;

  return {
    id: workKey ?? editionKey ?? title,
    workKey,
    editionKey,
    title,
    subtitle,
    authors,
    authorText:
      authors.length > 0 ? authors.join(", ") : "Penulis tidak diketahui",
    coverUrl,
    firstPublishYear: pickStringNumber(work.first_publish_year),
    publishDate: null,
    isbn10: null,
    isbn13: null,
    languages: [],
    publishers: [],
    subjects: dedupeStrings(work.subject).slice(0, SUBJECTS_LIMIT),
    pageCount: null,
    description: null,
    openLibraryUrl: safeOpenLibraryUrl(workKey, editionKey),
  };
}

export async function getOpenLibrarySubject(
  subject: string,
  params: SubjectBrowseParams,
): Promise<BookSearchResponse> {
  const cleanSubject = subject.toLowerCase().replace(/\s+/g, "_");
  const search = new URLSearchParams();
  search.set("limit", String(params.limit));
  search.set("offset", String(params.offset));

  const url = `${OPEN_LIBRARY_BASE}/subjects/${encodeURIComponent(cleanSubject)}.json?${search.toString()}`;
  const payload = await fetchJson<OpenLibrarySubjectPayload>(url, {
    next: { revalidate: SEARCH_REVALIDATE_SECONDS },
  });

  const works = Array.isArray(payload.works) ? payload.works : [];
  const results = works.map(normalizeSubjectWork);
  const total = pickStringNumber(payload.work_count, results.length) ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / params.limit) : 0;

  return {
    query: payload.name ?? cleanSubject,
    page: Math.floor(params.offset / params.limit) + 1,
    limit: params.limit,
    total,
    totalPages,
    results,
  };
}
