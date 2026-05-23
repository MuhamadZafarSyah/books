"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarHeart,
  Home,
  Library,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  Trophy,
  User,
  Users,
  UserSearch,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/actions/auth";

const mainNavItems = [
  {
    title: "Beranda",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Jelajahi",
    href: "/dashboard/explore",
    icon: Search,
  },
  {
    title: "Cari Pembaca",
    href: "/dashboard/explore/readers",
    icon: UserSearch,
  },
  // {
  //   title: "Rak Buku",
  //   href: "/dashboard/shelf",
  //   icon: Library,
  // },
  // {
  //   title: "Sedang Dibaca",
  //   href: "/dashboard/reading",
  //   icon: BookOpen,
  // },
  {
    title: "Diskusi AI",
    href: "/dashboard/explore/discussions",
    icon: Sparkles,
  },
  {
    title: "Circle Baca",
    href: "/dashboard/circles",
    icon: Users,
  },
  {
    title: "Agenda Baca",
    href: "/dashboard/events",
    icon: CalendarHeart,
  },
  {
    title: "Leaderboard",
    href: "/dashboard/leaderboard",
    icon: Trophy,
  },
  {
    title: "Chat",
    href: "/dashboard/chat",
    icon: MessageCircle,
  },
];

const secondaryNavItems = [
  {
    title: "Profil",
    href: "/dashboard/profile",
    icon: User,
  },
  // {
  //   title: "Pengaturan",
  //   href: "/dashboard/settings",
  //   icon: Settings,
  // },
];

type AppSidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

export function AppSidebar({ user }: { user: AppSidebarUser }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  /**
   * For each nav item, compute whether this exact href is the most
   * specific prefix match for the current pathname. This prevents
   * `/dashboard/explore` from staying highlighted when the user is on
   * `/dashboard/explore/discussions`, since the latter is a longer match.
   */
  const allHrefs = [...mainNavItems, ...secondaryNavItems].map((item) => item.href);

  const matchHref = (() => {
    let best: string | null = null;
    for (const href of allHrefs) {
      const matches =
        pathname === href ||
        (href !== "/dashboard" && pathname.startsWith(`${href}/`));
      if (!matches) continue;
      if (best === null || href.length > best.length) best = href;
    }
    return best;
  })();

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors duration-200 hover:bg-sidebar-accent"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Library aria-hidden="true" className="size-4" />
          </span>
          {!isCollapsed && (
            <span className="font-heading text-base font-semibold italic tracking-tight text-sidebar-foreground">
              Shelfgram
            </span>
          )}
        </Link>
      </SidebarHeader>

      <Separator className="mx-3 w-auto bg-sidebar-border" />

      <SidebarContent>
        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => {
                  const isActive = matchHref === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="cursor-pointer transition-colors duration-200"
                      >
                        <Link href={item.href}>
                          <item.icon
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Akun</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNavItems.map((item) => {
                  const isActive = matchHref === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="cursor-pointer transition-colors duration-200"
                      >
                        <Link href={item.href}>
                          <item.icon
                            aria-hidden="true"
                            className="size-4 shrink-0"
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <Separator className="mx-3 w-auto bg-sidebar-border" />

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name ?? ""} />
            )}
            <AvatarFallback>
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {user.name ?? "Pembaca"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          )}
          {!isCollapsed && (
            <form action={logout}>
              <button
                type="submit"
                aria-label="Keluar"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut aria-hidden="true" className="size-3.5" />
              </button>
            </form>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
