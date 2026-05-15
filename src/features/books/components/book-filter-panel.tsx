"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type BookFilters = {
  sort: "relevance" | "new" | "old";
  language: string;
  publisher: string;
  yearFrom: string;
  yearTo: string;
  subject: string;
};

export const DEFAULT_FILTERS: BookFilters = {
  sort: "relevance",
  language: "",
  publisher: "",
  yearFrom: "",
  yearTo: "",
  subject: "",
};

const ALL_VALUE = "__all__";

const LANGUAGE_OPTIONS = [
  { value: ALL_VALUE, label: "Semua bahasa" },
  { value: "eng", label: "English" },
  { value: "ind", label: "Indonesia" },
  { value: "jpn", label: "Japanese" },
  { value: "spa", label: "Spanish" },
  { value: "fre", label: "French" },
  { value: "ger", label: "German" },
];

const SORT_OPTIONS: { value: BookFilters["sort"]; label: string }[] = [
  { value: "relevance", label: "Paling relevan" },
  { value: "new", label: "Terbaru" },
  { value: "old", label: "Terlama" },
];

type BookFilterPanelProps = {
  value: BookFilters;
  onChange: (next: BookFilters) => void;
  className?: string;
};

export function BookFilterPanel({
  value,
  onChange,
  className,
}: BookFilterPanelProps) {
  const sortId = useId();
  const languageId = useId();
  const subjectId = useId();
  const publisherId = useId();
  const yearFromId = useId();
  const yearToId = useId();

  const update = <K extends keyof BookFilters>(
    key: K,
    next: BookFilters[K],
  ) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <FilterRow label="Urutkan" htmlFor={sortId}>
        <Select
          value={value.sort}
          onValueChange={(next) =>
            update("sort", next as BookFilters["sort"])
          }
        >
          <SelectTrigger id={sortId} className="w-full">
            <SelectValue placeholder="Pilih urutan" />
          </SelectTrigger>
          <SelectContent position="popper">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterRow>

      <FilterRow label="Bahasa" htmlFor={languageId}>
        <Select
          value={value.language === "" ? ALL_VALUE : value.language}
          onValueChange={(next) =>
            update("language", next === ALL_VALUE ? "" : next)
          }
        >
          <SelectTrigger id={languageId} className="w-full">
            <SelectValue placeholder="Semua bahasa" />
          </SelectTrigger>
          <SelectContent position="popper">
            {LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterRow>

      <FilterRow label="Subject / topik" htmlFor={subjectId}>
        <Input
          id={subjectId}
          value={value.subject}
          onChange={(event) => update("subject", event.target.value)}
          placeholder="fiction, biography, history..."
        />
      </FilterRow>

      <FilterRow label="Publisher" htmlFor={publisherId}>
        <Input
          id={publisherId}
          value={value.publisher}
          onChange={(event) => update("publisher", event.target.value)}
          placeholder="Gramedia, Penguin..."
        />
      </FilterRow>

      <div className="grid grid-cols-2 gap-4">
        <FilterRow label="Tahun dari" htmlFor={yearFromId}>
          <Input
            id={yearFromId}
            type="number"
            min={0}
            max={3000}
            inputMode="numeric"
            value={value.yearFrom}
            onChange={(event) => update("yearFrom", event.target.value)}
            placeholder="1990"
          />
        </FilterRow>
        <FilterRow label="Tahun sampai" htmlFor={yearToId}>
          <Input
            id={yearToId}
            type="number"
            min={0}
            max={3000}
            inputMode="numeric"
            value={value.yearTo}
            onChange={(event) => update("yearTo", event.target.value)}
            placeholder="2024"
          />
        </FilterRow>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-[10px] tracking-[0.18em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

export function hasActiveFilters(filters: BookFilters): boolean {
  return (
    filters.sort !== "relevance" ||
    filters.language !== "" ||
    filters.publisher !== "" ||
    filters.yearFrom !== "" ||
    filters.yearTo !== "" ||
    filters.subject !== ""
  );
}

export function countActiveFilters(filters: BookFilters): number {
  let count = 0;
  if (filters.sort !== "relevance") count += 1;
  if (filters.language !== "") count += 1;
  if (filters.publisher !== "") count += 1;
  if (filters.yearFrom !== "") count += 1;
  if (filters.yearTo !== "") count += 1;
  if (filters.subject !== "") count += 1;
  return count;
}
