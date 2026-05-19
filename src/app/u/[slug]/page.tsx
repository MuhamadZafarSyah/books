import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatQuickDock } from "@/features/chat/components/chat-quick-dock";
import { QuickChatVisibilityProvider } from "@/features/chat/components/quick-chat-visibility";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { PublicProfileShell } from "@/features/public-profile/components/public-profile-shell";
import { getPublicProfileBySlug } from "@/lib/public-profile";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfileBySlug(slug);

  if (!profile) {
    return { title: "Profil tidak ditemukan | Shelfgram" };
  }

  return {
    title: `${profile.user.name ?? profile.user.username ?? "Pembaca"} | Shelfgram`,
    description: profile.user.bio ?? "Profil publik pembaca Shelfgram.",
  };
}

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await requireAuth();
  const profile = await getPublicProfileBySlug(slug);

  if (!profile) notFound();

  return (
    <TooltipProvider>
      <QuickChatVisibilityProvider>
        <SidebarProvider className="h-svh min-h-0 overflow-hidden">
          <AppSidebar user={currentUser} />
          <SidebarInset className="min-h-0 overflow-hidden">
            <DashboardHeader />
            <div className="hide-scrollbar min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <PublicProfileShell profile={profile} />
            </div>
            <ChatQuickDock />
          </SidebarInset>
        </SidebarProvider>
      </QuickChatVisibilityProvider>
    </TooltipProvider>
  );
}
