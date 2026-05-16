"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { QuickChatToggleButton } from "@/features/chat/components/quick-chat-toggle-button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Beranda",
  "/dashboard/explore": "Jelajahi",
  "/dashboard/explore/discussions": "Diskusi AI",
  "/dashboard/explore/readers": "Cari Pembaca",
  "/dashboard/circles": "Circle Baca",
  "/dashboard/circles/discover": "Discover Circle",
  "/dashboard/shelf": "Rak Buku",
  "/dashboard/reading": "Sedang Dibaca",
  "/dashboard/chat": "Chat",
  "/dashboard/profile": "Profil",
  "/dashboard/profile/edit": "Edit Profil",
  "/dashboard/settings": "Pengaturan",
};

export function DashboardHeader() {
  const pathname = usePathname();
  let title = "Dashboard";
  if (pathname.startsWith("/u/")) title = "Profil Pembaca";
  else if (
    pathname.startsWith("/dashboard/explore/discussions/") &&
    pathname !== "/dashboard/explore/discussions"
  ) {
    title = "Diskusi AI";
  } else if (
    pathname.startsWith("/dashboard/circles/") &&
    pathname !== "/dashboard/circles" &&
    pathname !== "/dashboard/circles/discover"
  ) {
    title = "Circle Baca";
  } else {
    title = pageTitles[pathname] ?? "Dashboard";
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="cursor-pointer" />
      {/* <Separator orientation="vertical" className="h-full" /> */}
      <h1 className="font-heading text-base font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <div className="flex flex-1 gap-4 items-center justify-end ">
        <QuickChatToggleButton />
        <AnimatedThemeToggler className="button-click" />
      </div>
    </header>
  );
}
