"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "shelfgram.quick-chat-visible";

type QuickChatVisibilityContextValue = {
  /** Whether the floating quick chat button (and dock) is shown. */
  visible: boolean;
  toggle: () => void;
  setVisible: (next: boolean) => void;
};

const QuickChatVisibilityContext =
  createContext<QuickChatVisibilityContextValue | null>(null);

const STORE_LISTENERS = new Set<() => void>();

function notifyStoreListeners() {
  for (const listener of STORE_LISTENERS) listener();
}

function readSnapshot(): "true" | "false" | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "false" ? "false" : value === "true" ? "true" : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  STORE_LISTENERS.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    STORE_LISTENERS.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeSnapshot(value: "true" | "false") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore (e.g. private mode)
  }
  notifyStoreListeners();
}

/**
 * Provides shared `quick chat visible` state to both `ChatQuickDock` and
 * the dashboard header toggle.
 *
 * `useSyncExternalStore` is given a server snapshot of `null` so the
 * initial server-rendered HTML and the first client render agree on
 * `visible: true`. After hydration completes React subscribes and the
 * value is replaced with whatever sits in localStorage. This sequence
 * never produces a hydration mismatch because the SSR markup and the
 * first client render see the same snapshot.
 */
export function QuickChatVisibilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const stored = useSyncExternalStore(
    subscribe,
    () => readSnapshot(),
    () => null,
  );

  const visible = stored === "false" ? false : true;

  const setVisible = useCallback((next: boolean) => {
    writeSnapshot(next ? "true" : "false");
  }, []);

  const toggle = useCallback(() => {
    const current = readSnapshot();
    const nextVisible = current === "false" ? true : false;
    writeSnapshot(nextVisible ? "true" : "false");
  }, []);

  const value = useMemo<QuickChatVisibilityContextValue>(
    () => ({ visible, toggle, setVisible }),
    [visible, toggle, setVisible],
  );

  return (
    <QuickChatVisibilityContext.Provider value={value}>
      {children}
    </QuickChatVisibilityContext.Provider>
  );
}

export function useQuickChatVisibility(): QuickChatVisibilityContextValue {
  const ctx = useContext(QuickChatVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useQuickChatVisibility must be used inside <QuickChatVisibilityProvider />",
    );
  }
  return ctx;
}
