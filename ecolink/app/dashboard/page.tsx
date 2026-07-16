import { requireUserId } from "@/lib/auth";
import { DashboardSpa } from "@/components/dashboard/dashboard-spa";

export default async function DashboardPage() {
  const userId = await requireUserId();

  return <DashboardSpa userId={userId} />;
}
