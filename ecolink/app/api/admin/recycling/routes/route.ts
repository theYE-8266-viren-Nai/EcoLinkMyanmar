import { handlePickupRoutePlanAction } from "@/features/recycling-routes/api/recycling-route-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handlePickupRoutePlanAction(request);
}
