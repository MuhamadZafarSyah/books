import { HomeShell } from "@/features/dashboard/components/overview/home-shell";
import { getDashboardOverview } from "@/lib/dashboard/overview-queries";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();

  const overview = await getDashboardOverview({
    userId: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  });

  return <HomeShell overview={overview} />;
}
