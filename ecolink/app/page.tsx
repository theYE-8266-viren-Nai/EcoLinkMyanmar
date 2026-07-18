import { LiveMapLoader } from "@/features/live-map/components/live-map-loader";
import { loadLiveMapBootstrap } from "@/features/live-map/data/load-map-bootstrap";
import { AppShell } from "@/components/ecolink/app-shell";

export default async function HomePage() {
  const bootstrap = await loadLiveMapBootstrap();

  return (
    <AppShell disableScroll disablePadding>
      <LiveMapLoader {...bootstrap} />
    </AppShell>
  );
}
