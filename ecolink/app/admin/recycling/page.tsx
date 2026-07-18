import { redirect } from "next/navigation";

import { AdminRecyclingPage } from "@/features/recycling-routes/components/admin-recycling-page";
import { createRecyclingRouteWorkflowService, RecyclingRouteWorkflowError } from "@/features/recycling-routes/services/recycling-route-service";
import type { AdminPickupRoutingDashboard, AdminRouteRequestList } from "@/features/recycling-routes/types";

export const dynamic = "force-dynamic";

const EMPTY_REQUESTS: AdminRouteRequestList = {
  centerDropoffs: [],
  pickups: [],
};

export default async function AdminRecyclingRoutePage() {
  let initialRequests = EMPTY_REQUESTS;
  let initialRouting: AdminPickupRoutingDashboard | undefined;
  let initialError: string | undefined;

  try {
    const service = await createRecyclingRouteWorkflowService();
    [initialRequests, initialRouting] = await Promise.all([
      service.listAdminRequests(),
      service.getAdminRoutingDashboard(),
    ]);
  } catch (error) {
    if (error instanceof RecyclingRouteWorkflowError && error.status === 401) {
      redirect("/sign-in?redirect_url=/admin/recycling");
    }
    if (error instanceof RecyclingRouteWorkflowError && error.status === 403) {
      redirect("/dashboard");
    }
    console.error(error);
    initialError = error instanceof RecyclingRouteWorkflowError ? error.message : "Recycling route requests could not be loaded.";
  }

  return <AdminRecyclingPage initialError={initialError} initialRequests={initialRequests} initialRouting={initialRouting} />;
}
