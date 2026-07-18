import { handleGetCurrentRouteSubmission, handleSubmitRouteRequest } from "@/features/recycling-routes/api/recycling-route-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleGetCurrentRouteSubmission(request);
}

export async function POST(request: Request) {
  return handleSubmitRouteRequest(request);
}
