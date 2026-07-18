import { AppShell } from "@/components/ecolink/app-shell";
import { CitizenImpactDashboard } from "@/features/citizen-impact/components/citizen-impact-dashboard";

export default function ImpactPage() {
  return (
    <AppShell>
      <CitizenImpactDashboard />
    </AppShell>
  );
}
