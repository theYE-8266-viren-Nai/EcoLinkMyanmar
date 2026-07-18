import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/ecolink/app-shell";
import { ImpactDashboard } from "@/features/impact/components/impact-dashboard";
import { getImpactDashboardData } from "@/features/impact/data/dashboard-impact";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getImpactDashboardData(user);

  return (
    <AppShell>
      <ImpactDashboard data={data} />
    </AppShell>
  );
}
