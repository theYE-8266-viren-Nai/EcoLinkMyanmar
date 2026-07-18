import { createSupabaseServerClient } from "@/lib/supabase-server";
import { RecyclingRouteRepository } from "@/features/recycling-routes/data/recycling-route-repository";
import type { SubmitRouteRequestInput, UpdateCenterDropoffRouteRequestInput, UpdatePickupRouteRequestInput } from "@/features/recycling-routes/schemas/recycling-route";
import type { AdminRouteRequestList, MemberRouteSubmission, RouteSubmitResult } from "@/features/recycling-routes/types";

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
  submitRouteRequest(input: SubmitRouteRequestInput): Promise<RouteSubmitResult>;
  listAdminRequests(): Promise<AdminRouteRequestList>;
  updatePickupRequest(requestId: string, input: UpdatePickupRouteRequestInput): Promise<void>;
  updateCenterDropoffRequest(requestId: string, input: UpdateCenterDropoffRouteRequestInput): Promise<void>;
  deletePickupRequest(requestId: string): Promise<void>;
  deleteCenterDropoffRequest(requestId: string): Promise<void>;
};

async function createDefaultRepository() {
  return new RecyclingRouteRepository(await createSupabaseServerClient());
}

export async function createRecyclingRouteWorkflowService(): Promise<RecyclingRouteWorkflowService> {
  const repository = await createDefaultRepository();

  async function requireUser() {
    const user = await repository.getCurrentUser();
    if (!user) throw new RecyclingRouteWorkflowError("Sign in to continue.", 401);
    return user;
  }

  async function requireProfile() {
    const user = await requireUser();
    return repository.ensureCurrentProfile(user);
  }

  async function requireAdmin() {
    await requireProfile();
    if (!(await repository.isCurrentUserAdmin())) {
      throw new RecyclingRouteWorkflowError("Admin access required.", 403);
    }
  }

  return {
    async getCurrentSubmission() {
      const profile = await requireProfile();
      return repository.getCurrentSubmission(profile.profile_id);
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
      await repository.updatePickupRequest(requestId, input);
    },
    async updateCenterDropoffRequest(requestId, input) {
      await requireAdmin();
      await repository.updateCenterDropoffRequest(requestId, input);
    },
    async deletePickupRequest(requestId) {
      await requireAdmin();
      await repository.deletePickupRequest(requestId);
    },
    async deleteCenterDropoffRequest(requestId) {
      await requireAdmin();
      await repository.deleteCenterDropoffRequest(requestId);
    },
  };
}
