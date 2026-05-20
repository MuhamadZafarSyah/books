"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

export type ResizableShellProps = {
  /** Konten panel kiri (umumnya sidebar/history). */
  sidebar: ReactNode;
  /** Konten panel kanan (umumnya konten utama). */
  main: ReactNode;
  /** Kunci `localStorage` agar lebar yang di-drag user persisten. */
  storageKey: string;
  /** Lebar awal panel kiri dalam persen. Default 25%. */
  defaultSidebarSize?: number;
  /** Batas minimum panel kiri dalam persen. Default 16%. */
  minSidebarSize?: number;
  /** Batas maksimum panel kiri dalam persen. Default 40%. */
  maxSidebarSize?: number;
  className?: string;
};

const SIDEBAR_PANEL_ID = "shell-sidebar";
const MAIN_PANEL_ID = "shell-main";
const SAVE_DEBOUNCE_MS = 200;

type Layout = { [panelId: string]: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Shell dua kolom yang resizable di desktop dan stacked di mobile.
 *
 * - **Desktop (`md:` ke atas):** dirender sebagai `ResizablePanelGroup`
 *   horizontal dengan handle drag di tengah. Lebar panel kiri di-persist
 *   ke `localStorage` lewat `onLayoutChanged` (tidak ada `autoSaveId` di
 *   `react-resizable-panels` v4 — kita kelola manual agar tetap controlled
 *   dan satu source of truth per `storageKey`).
 * - **Mobile:** sidebar di-hide dan hanya `main` yang menempati layar —
 *   identik dengan implementasi grid sebelumnya.
 *
 * Komponen `"use client"` karena `react-resizable-panels` membutuhkan
 * akses ke DOM saat hydration; sebelum mount, fallback grid statis
 * dirender supaya tidak ada flicker layout.
 */
export function ResizableShell({
  sidebar,
  main,
  storageKey,
  defaultSidebarSize = 25,
  minSidebarSize = 16,
  maxSidebarSize = 40,
  className,
}: ResizableShellProps) {
  const [mounted, setMounted] = useState(false);
  const [savedSidebarSize, setSavedSidebarSize] = useState<number | null>(null);

  // Kunci penuh per `storageKey` agar dua shell yang berbeda (mis. circle vs
  // book-ai-chat) menyimpan preferensi terpisah.
  const storageFullKey = useMemo(
    () => `resizable-shell:${storageKey}`,
    [storageKey],
  );

  // Saat mount: baca preferensi dari localStorage. Defer setState ke
  // microtask supaya tidak melanggar `react-hooks/set-state-in-effect`
  // (React 19 strict).
  useEffect(() => {
    void Promise.resolve().then(() => {
      setMounted(true);
      try {
        const raw = window.localStorage.getItem(storageFullKey);
        if (!raw) return;
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) return;
        setSavedSidebarSize(
          clamp(parsed, minSidebarSize, maxSidebarSize),
        );
      } catch {
        // localStorage bisa tidak tersedia di mode private; aman diabaikan.
      }
    });
  }, [storageFullKey, minSidebarSize, maxSidebarSize]);

  const sidebarSize = savedSidebarSize ?? defaultSidebarSize;

  /**
   * Persist layout setiap kali user selesai resize. `react-resizable-panels`
   * memanggil `onLayoutChanged` dengan map `panelId -> size` dalam persen,
   * jadi kita tinggal ambil nilai panel sidebar.
   *
   * Debounce ringan (200 ms) menghindari panggilan storage yang terlalu
   * sering pada drag panjang. Timer disimpan di `useRef` agar tidak
   * memicu aturan React 19 strict ("cannot reassign closure after
   * render").
   */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  const handleLayoutChanged = useCallback(
    (layout: Layout) => {
      const next = layout[SIDEBAR_PANEL_ID];
      if (typeof next !== "number" || !Number.isFinite(next)) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          window.localStorage.setItem(storageFullKey, String(next));
        } catch {
          // Aman diabaikan di environment tanpa localStorage.
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [storageFullKey],
  );

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm",
        className,
      )}
    >
      {/* Mobile: stack tanpa panel group */}
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {main}
        </section>
      </div>

      {/* Desktop: resizable group */}
      <div className="hidden h-full min-h-0 md:block">
        {mounted ? (
          <ResizablePanelGroup
            orientation="horizontal"
            defaultLayout={{
              [SIDEBAR_PANEL_ID]: sidebarSize,
              [MAIN_PANEL_ID]: 100 - sidebarSize,
            }}
            onLayoutChanged={handleLayoutChanged}
            className="h-full min-h-0"
          >
            <ResizablePanel
              id={SIDEBAR_PANEL_ID}
              defaultSize={sidebarSize}
              minSize={minSidebarSize}
              maxSize={maxSidebarSize}
              className="min-h-0 min-w-0"
            >
              {sidebar}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              id={MAIN_PANEL_ID}
              defaultSize={100 - sidebarSize}
              minSize={40}
              className="min-h-0 min-w-0"
            >
              <section className="flex h-full min-h-0 min-w-0 flex-col">
                {main}
              </section>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          // Fallback SSR: grid statis dengan rasio default supaya tidak ada
          // flicker layout sebelum `react-resizable-panels` aktif.
          <div
            className="grid h-full min-h-0"
            style={{
              gridTemplateColumns: `${sidebarSize}% minmax(0, 1fr)`,
            }}
          >
            <div className="min-h-0">{sidebar}</div>
            <section className="flex min-h-0 min-w-0 flex-col">
              {main}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
