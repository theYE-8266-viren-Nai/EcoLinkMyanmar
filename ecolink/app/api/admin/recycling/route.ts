import { handleListAdminRouteRequests } from "@/features/recycling-routes/api/recycling-route-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleListAdminRouteRequests(request);
}
