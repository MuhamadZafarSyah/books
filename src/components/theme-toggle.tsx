"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      aria-label="Toggle theme"
      className="fixed right-4 bottom-4 z-50 rounded-full bg-background/80 shadow-lg backdrop-blur"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="icon"
      type="button"
      variant="outline"
    >
      {isDark ? (
        <Sun className="size-4 text-muted-foreground" />
      ) : (
        <Moon className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}

export { ThemeToggle };
