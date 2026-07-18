import { handlePublishCollectorLocation } from "@/features/live-map/api/collector-location-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handlePublishCollectorLocation(request);
}
