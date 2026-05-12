"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Beranda",
  "/dashboard/explore": "Jelajahi",
  "/dashboard/shelf": "Rak Buku",
  "/dashboard/reading": "Sedang Dibaca",
  "/dashboard/profile": "Profil",
  "/dashboard/settings": "Pengaturan",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="cursor-pointer" />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="font-heading text-base font-semibold tracking-tight text-foreground">
        {title}
      </h1>
    </header>
  );
}
