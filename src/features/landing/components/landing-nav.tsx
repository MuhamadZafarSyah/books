"use client";

import Link from "next/link";
import { LibraryBig, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#komunitas", label: "Komunitas" },
  { href: "#peminjaman", label: "Peminjaman" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-3 z-40 mx-auto w-full max-w-7xl rounded-[1.25rem] border border-border/80 bg-card/85 px-3 py-2.5 backdrop-blur-md transition-shadow duration-200 sm:top-4 sm:rounded-[1.5rem] sm:px-5 sm:py-3",
        scrolled
          ? "shadow-[0_16px_48px_rgba(36,26,18,0.12)]"
          : "shadow-[0_8px_28px_rgba(36,26,18,0.06)]",
      )}
    >
      <nav
        aria-label="Navigasi utama"
        className="flex items-center justify-between gap-3"
      >
        <Link
          className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:gap-3"
          href="/"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(31,77,58,0.18)] sm:size-10">
            <LibraryBig aria-hidden="true" className="size-4 sm:size-5" />
          </span>
          <span className="font-heading text-lg font-semibold italic tracking-tight sm:text-xl">
            Shelfgram
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              className="rounded-full text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            asChild
            className="hidden rounded-full normal-case tracking-normal sm:inline-flex"
            size="sm"
            variant="ghost"
          >
            <Link href="/auth/login">Masuk</Link>
          </Button>
          <Button
            asChild
            className="rounded-full px-4 normal-case tracking-normal shadow-[0_8px_20px_rgba(31,77,58,0.18)] sm:px-5"
            size="sm"
          >
            <Link href="/auth/register">Mulai</Link>
          </Button>
          <button
            aria-controls="mobile-nav"
            aria-expanded={open}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors duration-200 hover:bg-accent md:hidden"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </nav>

      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out md:hidden",
          open
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0",
        )}
        id="mobile-nav"
      >
        <div className="min-h-0">
          <ul className="flex flex-col gap-1 border-t border-border/80 pt-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-accent sm:hidden"
                href="/auth/login"
                onClick={() => setOpen(false)}
              >
                Masuk
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
