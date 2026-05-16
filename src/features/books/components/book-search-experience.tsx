"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  Search as SearchIcon,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BookCard } from "@/features/books/components/book-card";
import {
  BookFilterPanel,
  DEFAULT_FILTERS,
  countActiveFilters,
  hasActiveFilters,
  type BookFilters,
} from "@/features/books/components/book-filter-panel";
import { BookSearchSkeleton } from "@/features/books/components/book-search-skeleton";
import { BookDetailDrawer } from "@/features/books/components/book-detail-drawer";
import type { BookResult, BookSearchResponse } from "@/features/books/types";

const MIN_QUERY_LENGTH = 2;
const PAGE_LIMIT = 12;
const DEBOUNCE_MS = 500;

const SUBJECT_CHIPS = [
  { label: "Fiction", value: "fiction" },
  { label: "Self-help", value: "self-help" },
  { label: "Romance", value: "romance" },
  { label: "Biography", value: "biography" },
  { label: "Business", value: "business" },
  { label: "Science", value: "science" },
  { label: "History", value: "history" },
  { label: "Technology", value: "technology" },
];

type Status = "idle" | "loading" | "loadingMore" | "success" | "empty" | "error";

function trimmedFilters(filters: BookFilters): BookFilters {
  return {
    sort: filters.sort,
    language: filters.language.trim(),
    publisher: filters.publisher.trim(),
    yearFrom: filters.yearFrom.trim(),
    yearTo: filters.yearTo.trim(),
    subject: filters.subject.trim(),
  };
}

function buildSearchParams(
  query: string,
  filters: BookFilters,
  page: number,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(PAGE_LIMIT));

  if (query) params.set("q", query);
  if (filters.sort && filters.sort !== "relevance") {
    params.set("sort", filters.sort);
  }
  if (filters.language) params.set("language", filters.language);
  if (filters.publisher) params.set("publisher", filters.publisher);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.yearFrom) params.set("yearFrom", filters.yearFrom);
  if (filters.yearTo) params.set("yearTo", filters.yearTo);

  return params;
}

function shouldSkipSearch(query: string, filters: BookFilters) {
  if (query.length === 0) {
    return !filters.subject && !filters.publisher;
  }
  if (query.length < MIN_QUERY_LENGTH) return true;
  return false;
}

function buildSearchKey(query: string, filters: BookFilters) {
  if (shouldSkipSearch(query, filters)) {
    return `idle:${query}:${JSON.stringify(filters)}`;
  }

  return buildSearchParams(query, filters, 1).toString();
}

export function BookSearchExperience() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<BookFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<BookResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const trimmedQuery = query.trim();
  const safeFilters = useMemo(() => trimmedFilters(filters), [filters]);
  const searchKey = useMemo(
    () => buildSearchKey(trimmedQuery, safeFilters),
    [trimmedQuery, safeFilters],
  );
  const filterCount = countActiveFilters(safeFilters);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastAutoSearchKeyRef = useRef<string | null>(null);

  const runSearch = useCallback(
    async (
      requestQuery: string,
      requestFilters: BookFilters,
      requestPage: number,
      append: boolean,
    ) => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus(append ? "loadingMore" : "loading");
      setErrorMessage(null);

      try {
        const params = buildSearchParams(
          requestQuery,
          requestFilters,
          requestPage,
        );
        const response = await fetch(
          `/api/books/search?${params.toString()}`,
          { signal: controller.signal },
        );

        if (requestId !== requestIdRef.current) return;

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(
            data?.error ?? "Tidak bisa memuat hasil. Coba lagi sebentar.",
          );
        }

        const data = (await response.json()) as BookSearchResponse;
        if (requestId !== requestIdRef.current) return;

        setTotal(data.total);
        setResults((current) =>
          append ? [...current, ...data.results] : data.results,
        );
        setPage(data.page);
        setStatus(data.results.length === 0 && !append ? "empty" : "success");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat hasil.",
        );
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (lastAutoSearchKeyRef.current === searchKey) return;
      lastAutoSearchKeyRef.current = searchKey;

      if (shouldSkipSearch(trimmedQuery, safeFilters)) {
        abortRef.current?.abort();
        requestIdRef.current += 1;
        setResults([]);
        setTotal(0);
        setPage(1);
        setStatus("idle");
        setErrorMessage(null);
        return;
      }

      runSearch(trimmedQuery, safeFilters, 1, false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchKey, trimmedQuery, safeFilters, runSearch]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (status === "loading" || status === "loadingMore") return;
    runSearch(trimmedQuery, safeFilters, page + 1, true);
  }, [status, runSearch, trimmedQuery, safeFilters, page]);

  const handleQuickSubject = useCallback((subject: string) => {
    setFilters((current) => ({
      ...current,
      subject: current.subject === subject ? "" : subject,
    }));
  }, []);

  const hasMore = results.length < total;

  return (
    <div className="space-y-8">
      <Header
        query={query}
        onQueryChange={setQuery}
        onClearQuery={() => setQuery("")}
        loading={status === "loading"}
        filterCount={filterCount}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={setFilters}
        onResetFilters={handleReset}
      />

      <SubjectRow
        active={safeFilters.subject}
        onPick={handleQuickSubject}
      />

      <ResultsHeader
        total={total}
        loading={status === "loading"}
        query={trimmedQuery}
      />

      <ResultsBody
        status={status}
        errorMessage={errorMessage}
        results={results}
        hasMore={hasMore}
        loadingMore={status === "loadingMore"}
        onLoadMore={handleLoadMore}
        onSelect={setSelectedBook}
        onResetFilters={handleReset}
        hasFilters={hasActiveFilters(safeFilters)}
        onRetry={() => runSearch(trimmedQuery, safeFilters, 1, false)}
      />

      <BookDetailDrawer
        book={selectedBook}
        onOpenChange={(open) => {
          if (!open) setSelectedBook(null);
        }}
      />
    </div>
  );
}

function Header({
  query,
  onQueryChange,
  onClearQuery,
  loading,
  filterCount,
  filtersOpen,
  onFiltersOpenChange,
  filters,
  onFiltersChange,
  onResetFilters,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  loading: boolean;
  filterCount: number;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  filters: BookFilters;
  onFiltersChange: (next: BookFilters) => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Jelajahi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cari judul, penulis, ISBN, atau topik dari katalog Open Library.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari buku, penulis, atau ISBN..."
            aria-label="Cari buku di Open Library"
            className="h-11 rounded-full border border-border bg-card pl-10 pr-10 text-sm shadow-sm transition-colors duration-200 focus-visible:border-b-border"
          />
          {/* {query.length > 0 && (
            <button
              type="button"
              onClick={onClearQuery}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )} */}
          {loading && (
            <Loader2
              aria-hidden="true"
              className="absolute right-9 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          )}
          <FiltersDrawer
            open={filtersOpen}
            onOpenChange={onFiltersOpenChange}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onReset={onResetFilters}
            filterCount={filterCount}
          />
        </div>


      </div>
    </section>
  );
}

function FiltersDrawer({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onReset,
  filterCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BookFilters;
  onFiltersChange: (next: BookFilters) => void;
  onReset: () => void;
  filterCount: number;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="absolute  border-l-border right-0 top-1/2 size-4 -translate-y-1/2 h-11 cursor-pointer  "
          aria-label={`Buka filter${filterCount > 0 ? `, ${filterCount} aktif` : ""}`}
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5 text-muted-foreground!" />
          {/* Filter */}
          {filterCount > 0 && (
            <span className="ml-1 absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-background">
        <DrawerHeader className="px-6 pb-5 pt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            Filter
          </p>
          <DrawerTitle className="mt-2 text-lg leading-tight tracking-normal normal-case">
            Saring katalog
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            Persempit pencarian berdasarkan bahasa, tahun, atau publisher.
          </DrawerDescription>
        </DrawerHeader>

        <Separator />

        <div className="hide-scrollbar flex-1 overflow-y-auto px-6 py-6">
          <BookFilterPanel value={filters} onChange={onFiltersChange} />
        </div>

        <Separator />

        <DrawerFooter className="px-6 py-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={filterCount === 0}
              className="cursor-pointer rounded-full"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Reset
            </Button>
            <DrawerClose asChild>
              <Button
                type="button"
                size="sm"
                className="flex-1 cursor-pointer rounded-full"
              >
                Terapkan
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function SubjectRow({
  active,
  onPick,
}: {
  active: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
      {SUBJECT_CHIPS.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onPick(chip.value)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/70 bg-card text-foreground hover:border-primary/40 hover:bg-secondary",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultsHeader({
  total,
  loading,
  query,
}: {
  total: number;
  loading: boolean;
  query: string;
}) {
  if (!query && total === 0 && !loading) return null;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
        {query ? `Hasil untuk "${query}"` : "Hasil pencarian"}
      </h2>
      {!loading && total > 0 && (
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString("id-ID")} buku
        </span>
      )}
    </div>
  );
}

function ResultsBody({
  status,
  errorMessage,
  results,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelect,
  onResetFilters,
  hasFilters,
  onRetry,
}: {
  status: Status;
  errorMessage: string | null;
  results: BookResult[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect: (book: BookResult) => void;
  onResetFilters: () => void;
  hasFilters: boolean;
  onRetry: () => void;
}) {
  if (status === "loading" && results.length === 0) {
    return <BookSearchSkeleton count={12} />;
  }

  if (status === "error") {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="destructive"
        title="Gagal memuat hasil"
        description={
          errorMessage ??
          "Server Open Library belum bisa dijangkau. Coba lagi dalam beberapa saat."
        }
        action={
          <Button
            type="button"
            size="sm"
            onClick={onRetry}
            className="cursor-pointer rounded-full"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Coba lagi
          </Button>
        }
      />
    );
  }

  if (status === "empty") {
    return (
      <EmptyState
        icon={SearchX}
        title="Belum ada buku yang cocok"
        description="Coba ubah kata kunci, gunakan judul yang lebih pendek, atau hapus beberapa filter aktif."
        action={
          hasFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="cursor-pointer rounded-full"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              Reset filter
            </Button>
          ) : null
        }
      />
    );
  }

  if (status === "idle" && results.length === 0) {
    return (
      <EmptyState
        icon={SearchIcon}
        tone="primary"
        title="Mulai dengan satu kata kunci"
        description="Cari judul, penulis, ISBN, atau pilih chip subject di atas untuk membuka katalog Open Library."
      />
    );
  }

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((book) => (
          <BookCard key={book.id} book={book} onSelect={onSelect} />
        ))}
      </div>

      {(hasMore || loadingMore) && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            aria-busy={loadingMore}
            disabled={loadingMore}
            className="cursor-pointer rounded-full px-6"
          >
            {loadingMore && (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            )}
            {loadingMore ? "Memuat..." : "Tampilkan lebih banyak"}
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  tone = "default",
  title,
  description,
  action,
}: {
  icon: typeof SearchIcon;
  tone?: "default" | "primary" | "destructive";
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
      <span
        className={cn(
          "mx-auto grid size-11 place-items-center rounded-2xl",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "destructive" && "bg-destructive/10 text-destructive",
          tone === "default" && "bg-secondary text-secondary-foreground",
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
