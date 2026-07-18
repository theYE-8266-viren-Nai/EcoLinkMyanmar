import { LiveMapLoader } from "@/features/live-map/components/live-map-loader";
import { loadLiveMapBootstrap } from "@/features/live-map/data/load-map-bootstrap";

export default async function HomePage() {
  const bootstrap = await loadLiveMapBootstrap();

  return <LiveMapLoader {...bootstrap} />;
}
