import { describe, expect, it, vi } from "vitest";

import {
  handleDeleteCenterDropoffRouteRequest,
  handleListAdminRouteRequests,
  handleSubmitRouteRequest,
  handleUpdatePickupRouteRequest,
} from "@/features/recycling-routes/api/recycling-route-handlers";
import { RecyclingRouteWorkflowError, type RecyclingRouteWorkflowService } from "@/features/recycling-routes/services/recycling-route-service";

const requestId = "11111111-1111-4111-8111-111111111111";
const scheduleId = "22222222-2222-4222-8222-222222222222";
const schedule = {
  id: scheduleId,
  startsAt: "2026-07-25T01:30:00.000Z",
  endsAt: "2026-07-25T04:30:00.000Z",
  routeArea: "Yangon partner route",
  status: "OPEN" as const,
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/recycling-route", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function selectedItems() {
  return [{
    itemType: "Plastic bottle",
    materialLabel: "PET plastic",
    materialSlug: "pet-plastic",
    estimatedCount: 4,
    estimatedWeightKg: 0.1,
    estimatedPoints: 4,
  }];
}

function pickupPayload() {
  return {
    type: "pickup",
    pickupAddress: "Bahan Township, Yangon",
    scheduleId,
    latitude: 16.818,
    longitude: 96.158,
    selectedItems: selectedItems(),
    estimatedWeightKg: 0.1,
    estimatedPoints: 4,
    notes: "Call at gate",
  };
}

function service(overrides: Partial<RecyclingRouteWorkflowService> = {}): RecyclingRouteWorkflowService {
  return {
    getCurrentSubmission: vi.fn(async () => null),
    getUpcomingSchedule: vi.fn(async () => schedule),
    submitRouteRequest: vi.fn(async () => ({ requestId, status: "PENDING" as const, createdAt: "2026-07-18T00:00:00Z" })),
    listAdminRequests: vi.fn(async () => ({ pickups: [], centerDropoffs: [] })),
    updatePickupRequest: vi.fn(async () => ({})),
    updateCenterDropoffRequest: vi.fn(async () => undefined),
    deletePickupRequest: vi.fn(async () => undefined),
    deleteCenterDropoffRequest: vi.fn(async () => undefined),
    getAdminRoutingDashboard: vi.fn(async () => ({ schedule, routes: [], unroutableAcceptedCount: 0 })),
    replanPickupRoutes: vi.fn(async () => ({})),
    dispatchPickupRoutes: vi.fn(async () => undefined),
    unlockPickupRoutes: vi.fn(async () => ({})),
    ...overrides,
  };
}

describe("recycling route handlers", () => {
  it("submits a first pickup request", async () => {
    const fakeService = service();
    const response = await handleSubmitRouteRequest(jsonRequest(pickupPayload()), { service: fakeService });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      request: { requestId, status: "PENDING", createdAt: "2026-07-18T00:00:00Z" },
    });
    expect(fakeService.submitRouteRequest).toHaveBeenCalledWith(expect.objectContaining({
      pickupAddress: "Bahan Township, Yangon",
      type: "pickup",
    }));
  });

  it("rejects invalid center drop-off payloads", async () => {
    const response = await handleSubmitRouteRequest(jsonRequest({
      type: "center_dropoff",
      centerId: "",
      centerName: "",
      centerAddress: "",
      centerTownship: "",
      centerHours: "",
      selectedItems: [],
      estimatedWeightKg: 0,
      estimatedPoints: 0,
    }), { service: service() });

    expect(response.status).toBe(400);
  });

  it("returns conflict when a member already submitted any route type", async () => {
    const response = await handleSubmitRouteRequest(jsonRequest(pickupPayload()), {
      service: service({
        submitRouteRequest: vi.fn(async () => {
          throw new Error("You already submitted a recycling route request.");
        }),
      }),
    });

    expect(response.status).toBe(409);
  });

  it("returns an actionable service error when the route RPC migration is missing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleSubmitRouteRequest(jsonRequest(pickupPayload()), {
      service: service({
        submitRouteRequest: vi.fn(async () => {
          throw new Error("Could not find the function public.submit_recycling_pickup_request in the schema cache");
        }),
      }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Recycling routes are not configured yet. Apply the latest Supabase migrations and try again.",
    });
    consoleError.mockRestore();
  });

  it("protects admin list access through the service", async () => {
    const response = await handleListAdminRouteRequests(new Request("http://localhost/api/admin/recycling"), {
      service: service({
        listAdminRequests: vi.fn(async () => {
          throw new RecyclingRouteWorkflowError("Admin access required.", 403);
        }),
      }),
    });

    expect(response.status).toBe(403);
  });

  it("validates admin update request ids before saving", async () => {
    const response = await handleUpdatePickupRouteRequest(jsonRequest({
      status: "ACCEPTED",
      pickupAddress: "Bahan Township, Yangon",
      scheduleId,
      latitude: 16.818,
      longitude: 96.158,
      notes: null,
    }), "not-a-uuid", { service: service() });

    expect(response.status).toBe(400);
  });

  it("lets admins soft-delete center drop-off requests", async () => {
    const fakeService = service();
    const response = await handleDeleteCenterDropoffRouteRequest(requestId, { service: fakeService });

    expect(response.status).toBe(200);
    expect(fakeService.deleteCenterDropoffRequest).toHaveBeenCalledWith(requestId);
  });
});
