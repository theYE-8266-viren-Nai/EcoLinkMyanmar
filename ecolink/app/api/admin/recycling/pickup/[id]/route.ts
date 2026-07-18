import { handleDeletePickupRouteRequest, handleUpdatePickupRouteRequest } from "@/features/recycling-routes/api/recycling-route-handlers";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleUpdatePickupRouteRequest(request, id);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleDeletePickupRouteRequest(id);
}
