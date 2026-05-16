"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Search as SearchIcon, X } from "lucide-react";
import { useDebounceCallback } from "usehooks-ts";

import { Input } from "@/components/ui/input";
import { UserSearchEmptyState } from "@/features/users/components/user-search-empty-state";
import { UserSearchList } from "@/features/users/components/user-search-list";
import { UserSearchSkeleton } from "@/features/users/components/user-search-skeleton";
import { cn } from "@/lib/utils";
import type {
  UserSearchResponse,
  UserSearchResult,
} from "@/features/users/types";

const DEBOUNCE_MS = 450;
const PAGE_LIMIT = 12;

type Status = "idle" | "loading" | "success" | "empty" | "error";

export function UserSearchExperience() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (request: string) => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (request.length > 0) params.set("q", request);
      params.set("limit", String(PAGE_LIMIT));

      const response = await fetch(
        `/api/users/search?${params.toString()}`,
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

      const data = (await response.json()) as UserSearchResponse;
      if (requestId !== requestIdRef.current) return;

      setResults(data.results);
      setStatus(
        data.results.length === 0
          ? request.length > 0
            ? "empty"
            : "idle"
          : "success",
      );
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
  }, []);

  const debouncedSearch = useDebounceCallback(runSearch, DEBOUNCE_MS);

  // The debounced search effect below also fires on mount with an empty
  // query, which loads suggested readers. Keeping a single trigger path
  // avoids running runSearch synchronously inside an effect.
  useEffect(() => {
    debouncedSearch(trimmedQuery);
  }, [trimmedQuery, debouncedSearch]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleRetry = useCallback(() => {
    void runSearch(trimmedQuery);
  }, [runSearch, trimmedQuery]);

  return (
    <div className="space-y-6">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        onClear={() => setQuery("")}
        loading={status === "loading"}
      />

      <ResultsHeader
        status={status}
        query={trimmedQuery}
        total={results.length}
      />

      <ResultsBody
        status={status}
        query={trimmedQuery}
        results={results}
        errorMessage={errorMessage}
        onRetry={handleRetry}
      />
    </div>
  );
}

function SearchBar({
  query,
  onQueryChange,
  onClear,
  loading,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <div className="relative">
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Cari pembaca berdasarkan nama atau username..."
        aria-label="Cari pembaca"
        className={cn(
          "h-12 rounded-full border border-border bg-card pl-11 pr-12 text-sm shadow-sm",
          "focus-visible:border-b-border",
        )}
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Bersihkan pencarian"
          className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
      {loading && query.length > 0 && (
        <Loader2
          aria-hidden="true"
          className="absolute right-10 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      )}
    </div>
  );
}

function ResultsHeader({
  status,
  query,
  total,
}: {
  status: Status;
  query: string;
  total: number;
}) {
  if (status === "loading" || status === "error") return null;
  if (status === "idle" && total === 0) return null;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
        {query
          ? `Hasil untuk "${query}"`
          : "Pembaca yang mungkin kamu kenal"}
      </h2>
      {total > 0 && (
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString("id-ID")} pembaca
        </span>
      )}
    </div>
  );
}

function ResultsBody({
  status,
  query,
  results,
  errorMessage,
  onRetry,
}: {
  status: Status;
  query: string;
  results: UserSearchResult[];
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (status === "loading" && results.length === 0) {
    return <UserSearchSkeleton count={6} />;
  }

  if (status === "error") {
    return (
      <UserSearchEmptyState
        variant="error"
        errorMessage={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (status === "empty") {
    return <UserSearchEmptyState variant="no-results" query={query} />;
  }

  if (status === "idle" && results.length === 0) {
    return <UserSearchEmptyState variant="idle" />;
  }

  return <UserSearchList users={results} />;
}
