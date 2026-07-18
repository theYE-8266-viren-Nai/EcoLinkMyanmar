import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { RecyclingRouteRepository } from "@/features/recycling-routes/data/recycling-route-repository";
import type { SubmitRouteRequestInput, UpdateCenterDropoffRouteRequestInput, UpdatePickupRouteRequestInput } from "@/features/recycling-routes/schemas/recycling-route";
import type { AdminRouteRequestList, MemberRouteSubmission, RouteSubmitResult } from "@/features/recycling-routes/types";
import type { AdminPickupRoutingDashboard, PickupSchedule } from "@/features/recycling-routes/types";
import { mapboxRoadRoutingProvider } from "@/features/recycling-routes/services/mapbox-road-routing";
import { generateTwoPickupLoops, type RoadRoutingProvider } from "@/features/recycling-routes/utils/two-loop-planner";

export class RecyclingRouteWorkflowError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type RecyclingRouteWorkflowService = {
  getCurrentSubmission(): Promise<MemberRouteSubmission | null>;
  getUpcomingSchedule(): Promise<PickupSchedule>;
  submitRouteRequest(input: SubmitRouteRequestInput): Promise<RouteSubmitResult>;
  listAdminRequests(): Promise<AdminRouteRequestList>;
  updatePickupRequest(requestId: string, input: UpdatePickupRouteRequestInput): Promise<{ warning?: string }>;
  updateCenterDropoffRequest(requestId: string, input: UpdateCenterDropoffRouteRequestInput): Promise<void>;
  deletePickupRequest(requestId: string): Promise<void>;
  deleteCenterDropoffRequest(requestId: string): Promise<void>;
  getAdminRoutingDashboard(): Promise<AdminPickupRoutingDashboard>;
  replanPickupRoutes(): Promise<{ warning?: string }>;
  dispatchPickupRoutes(): Promise<void>;
  unlockPickupRoutes(): Promise<{ warning?: string }>;
};

async function createDefaultRepository() {
  return new RecyclingRouteRepository(await createSupabaseServerClient());
}

function createAdminRepository() {
  return new RecyclingRouteRepository(createSupabaseAdminClient());
}

export async function createRecyclingRouteWorkflowService(
  routingProvider: RoadRoutingProvider = mapboxRoadRoutingProvider,
): Promise<RecyclingRouteWorkflowService> {
  const repository = await createDefaultRepository();
  let adminRepository: RecyclingRouteRepository | undefined;
  let profilePromise: ReturnType<RecyclingRouteRepository["ensureCurrentProfile"]> | undefined;

  function getAdminRepository() {
    adminRepository ??= createAdminRepository();
    return adminRepository;
  }

  async function requireUser() {
    const user = await repository.getCurrentUser();
    if (!user) throw new RecyclingRouteWorkflowError("Sign in to continue.", 401);
    return user;
  }

  function requireProfile() {
    profilePromise ??= requireUser().then((user) => repository.ensureCurrentProfile(user));
    return profilePromise;
  }

  async function requireAdmin() {
    await requireProfile();
    if (!(await repository.isCurrentUserAdmin())) {
      throw new RecyclingRouteWorkflowError("Admin access required.", 403);
    }
  }

  async function replan(schedule: PickupSchedule) {
    if (schedule.status === "DISPATCHED") return { warning: "Routes are dispatched and locked. Unlock them before replanning." };
    const routeRepository = getAdminRepository();
    try {
      const pickups = await routeRepository.listAcceptedRoutablePickups(schedule.id);
      const loops = await generateTwoPickupLoops(pickups, routingProvider);
      await routeRepository.saveDraftLoops(schedule, loops);
      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : "The pickup routes could not be generated.";
      await routeRepository.markRouteGenerationError(schedule.id, message);
      return { warning: `Pickup saved, but route generation needs attention: ${message}` };
    }
  }

  return {
    async getCurrentSubmission() {
      const profile = await requireProfile();
      return repository.getCurrentSubmission(profile.profile_id);
    },
    async getUpcomingSchedule() {
      await requireProfile();
      return repository.getUpcomingSchedule();
    },
    async submitRouteRequest(input) {
      await requireProfile();
      return repository.submitRouteRequest(input);
    },
    async listAdminRequests() {
      await requireAdmin();
      return repository.listAdminRequests();
    },
    async updatePickupRequest(requestId, input) {
      await requireAdmin();
      const schedule = await repository.getUpcomingSchedule();
      if (schedule.status === "DISPATCHED") {
        throw new RecyclingRouteWorkflowError("Unlock the dispatched pickup loops before editing scheduled pickups.", 409);
      }
      await repository.updatePickupRequest(requestId, input);
      return replan(schedule);
    },
    async updateCenterDropoffRequest(requestId, input) {
      await requireAdmin();
      await repository.updateCenterDropoffRequest(requestId, input);
    },
    async deletePickupRequest(requestId) {
      await requireAdmin();
      const schedule = await repository.getUpcomingSchedule();
      if (schedule.status === "DISPATCHED") {
        throw new RecyclingRouteWorkflowError("Unlock the dispatched pickup loops before deleting scheduled pickups.", 409);
      }
      await repository.deletePickupRequest(requestId);
      await replan(schedule);
    },
    async deleteCenterDropoffRequest(requestId) {
      await requireAdmin();
      await repository.deleteCenterDropoffRequest(requestId);
    },
    async getAdminRoutingDashboard() {
      await requireAdmin();
      const schedule = await repository.getUpcomingSchedule();
      const routeRepository = getAdminRepository();
      let dashboard = await routeRepository.getAdminRoutingDashboard(schedule);
      if (dashboard.routes.length === 0 && schedule.status !== "DISPATCHED") {
        await replan(schedule);
        dashboard = await routeRepository.getAdminRoutingDashboard(schedule);
      }
      return dashboard;
    },
    async replanPickupRoutes() {
      await requireAdmin();
      return replan(await repository.getUpcomingSchedule());
    },
    async dispatchPickupRoutes() {
      await requireAdmin();
      const schedule = await repository.getUpcomingSchedule();
      const routeRepository = getAdminRepository();
      const dashboard = await routeRepository.getAdminRoutingDashboard(schedule);
      if (dashboard.routes.length !== 2 || dashboard.routes.some((route) => route.status === "ERROR")) {
        throw new RecyclingRouteWorkflowError("Generate both pickup loops successfully before dispatching.", 409);
      }
      await routeRepository.setRouteDispatchState(schedule.id, true);
    },
    async unlockPickupRoutes() {
      await requireAdmin();
      const schedule = await repository.getUpcomingSchedule();
      await getAdminRepository().setRouteDispatchState(schedule.id, false);
      return replan({ ...schedule, status: "OPEN" });
    },
  };
}
