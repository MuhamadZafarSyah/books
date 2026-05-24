"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import {
  useColorScheme,
  COLOR_SCHEMES,
  type ColorScheme,
} from "@/components/color-scheme-provider";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const MODE_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

const SCHEME_META: Record<
  ColorScheme,
  { label: string; swatch: string; swatchDark: string; description: string }
> = {
  forest: {
    label: "Forest",
    swatch: "#1f4d3a",
    swatchDark: "#8fb89e",
    description: "Hijau hangat",
  },
  sage: {
    label: "Sage",
    swatch: "#5f8a72",
    swatchDark: "#8fb89e",
    description: "Hijau abu lembut",
  },
  mocha: {
    label: "Mocha",
    swatch: "#7a5c42",
    swatchDark: "#c4a07a",
    description: "Cokelat hangat",
  },
  lavender: {
    label: "Lavender",
    swatch: "#7e6b9e",
    swatchDark: "#b8a8d0",
    description: "Ungu lembut",
  },
  slate: {
    label: "Slate",
    swatch: "#4b5e74",
    swatchDark: "#8fa4b8",
    description: "Abu-abu tenang",
  },
  pink: {
    label: "Rose",
    swatch: "#be185d",
    swatchDark: "#f472b6",
    description: "Pink cerah",
  },
  blue: {
    label: "Ocean",
    swatch: "#1d4ed8",
    swatchDark: "#60a5fa",
    description: "Biru laut",
  },
  purple: {
    label: "Violet",
    swatch: "#7c3aed",
    swatchDark: "#a78bfa",
    description: "Ungu tegas",
  },
  orange: {
    label: "Amber",
    swatch: "#c2410c",
    swatchDark: "#fb923c",
    description: "Oranye hangat",
  },
  sketchy: {
    label: "Sketchy",
    swatch: "#3d3428",
    swatchDark: "#d4c4a0",
    description: "Hand-drawn",
  },
};

export function SettingsClient() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground">
          Sesuaikan tampilan Shelfgram sesuai preferensimu.
        </p>
      </header>

      {/* Mode (light/dark/system) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Mode tampilan</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pilih antara terang, gelap, atau ikuti pengaturan sistem.
          </p>
        </div>
        <div className="flex gap-2">
          {MODE_OPTIONS.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <option.icon aria-hidden="true" className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Color scheme */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Skema warna</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ganti aksen warna utama di seluruh aplikasi.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {COLOR_SCHEMES.map((scheme) => {
            const meta = SCHEME_META[scheme];
            const active = colorScheme === scheme;
            const swatch =
              resolvedTheme === "dark" ? meta.swatchDark : meta.swatch;

            return (
              <button
                key={scheme}
                type="button"
                onClick={() => setColorScheme(scheme)}
                className={cn(
                  "group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-150",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/30",
                  scheme === "sketchy" && "font-[var(--font-sketchy)]",
                )}
              >
                <span
                  className={cn(
                    "size-7 rounded-full shadow-sm ring-2 ring-background transition-transform duration-150 group-hover:scale-110",
                    scheme === "sketchy" && "rounded-none! rotate-2 border-2 border-dashed border-foreground/30",
                  )}
                  style={{ backgroundColor: swatch }}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-primary" : "text-foreground",
                  )}
                >
                  {meta.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {meta.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
