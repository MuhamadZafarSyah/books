import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { ChatQuickDock } from "@/features/chat/components/chat-quick-dock";
import { requireAuth } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();


  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-0 overflow-hidden">
        <AppSidebar user={user} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <DashboardHeader />
          <div className="hide-scrollbar min-h-0 flex-1 overflow-auto p-4 md:p-6">{children}</div>
          <ChatQuickDock />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
