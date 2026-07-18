import { handleGetWasteMap } from "@/features/live-map/api/waste-map-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleGetWasteMap(request);
}
