"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ColorScheme = "forest" | "pink" | "blue" | "purple" | "orange" | "sage" | "lavender" | "mocha" | "slate";

const COLOR_SCHEMES: ColorScheme[] = ["forest", "sage", "mocha", "lavender", "slate", "pink", "blue", "purple", "orange"];

const STORAGE_KEY = "shelfgram-color-scheme";
const CHANGE_EVENT = "shelfgram-color-scheme-change";

const SCHEME_CLASS_MAP: Record<ColorScheme, string | null> = {
  forest: null, // default, no class needed
  pink: "theme-pink",
  blue: "theme-blue",
  purple: "theme-purple",
  orange: "theme-orange",
  sage: "theme-sage",
  lavender: "theme-lavender",
  mocha: "theme-mocha",
  slate: "theme-slate",
};

type ColorSchemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

function getStoredScheme(): ColorScheme {
  if (typeof window === "undefined") return "forest";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && COLOR_SCHEMES.includes(stored as ColorScheme)) {
    return stored as ColorScheme;
  }
  return "forest";
}

function applySchemeClass(scheme: ColorScheme) {
  const html = document.documentElement;
  // Remove all scheme classes
  for (const cls of Object.values(SCHEME_CLASS_MAP)) {
    if (cls) html.classList.remove(cls);
  }
  // Add new scheme class
  const cls = SCHEME_CLASS_MAP[scheme];
  if (cls) html.classList.add(cls);
}

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useSyncExternalStore(
    (onStoreChange) => {
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener(CHANGE_EVENT, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(CHANGE_EVENT, handler);
      };
    },
    getStoredScheme,
    () => "forest" as ColorScheme,
  );

  useEffect(() => {
    applySchemeClass(colorScheme);
  }, [colorScheme]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    window.localStorage.setItem(STORAGE_KEY, scheme);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo<ColorSchemeContextValue>(
    () => ({ colorScheme, setColorScheme }),
    [colorScheme, setColorScheme],
  );

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error("useColorScheme must be used within ColorSchemeProvider.");
  }
  return context;
}

export { COLOR_SCHEMES };
