import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { SubmitRouteRequestInput, UpdateCenterDropoffRouteRequestInput, UpdatePickupRouteRequestInput } from "@/features/recycling-routes/schemas/recycling-route";
import type {
  AdminCenterDropoffRouteRequest,
  AdminPickupRouteRequest,
  MemberRouteSubmission,
  RouteSubmitResult,
  SelectedRecyclingItem,
} from "@/features/recycling-routes/types";
import { selectedItemsToJson } from "@/features/recycling-routes/types";
import type { Database, Json } from "@/lib/database.types";

type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "display_name" | "email">;
type PickupRow = Database["public"]["Tables"]["recycling_pickup_requests"]["Row"];
type CenterDropoffRow = Database["public"]["Tables"]["recycling_center_dropoff_requests"]["Row"];
type RouteLockRow = Database["public"]["Tables"]["recycling_route_submission_locks"]["Row"];
type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type EnsureProfileRow = {
  profile_id: string;
  member_code: string;
  display_name: string;
};

function readDisplayName(user: User) {
  const metadataName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  return metadataName || user.email?.split("@")[0] || "EcoLink member";
}

function numberValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function readSelectedItems(value: Json): SelectedRecyclingItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    const itemType = typeof record.itemType === "string" ? record.itemType : "";
    const materialLabel = typeof record.materialLabel === "string" ? record.materialLabel : "";
    if (!itemType || !materialLabel) return [];
    return [{
      itemType,
      materialLabel,
      materialSlug: typeof record.materialSlug === "string" ? record.materialSlug : null,
      estimatedCount: typeof record.estimatedCount === "number" ? numberValue(record.estimatedCount) : 0,
      estimatedWeightKg: typeof record.estimatedWeightKg === "number" ? numberValue(record.estimatedWeightKg) : 0,
      estimatedPoints: typeof record.estimatedPoints === "number" ? numberValue(record.estimatedPoints) : 0,
    }];
  });
}

function toPickupSubmission(row: PickupRow): MemberRouteSubmission {
  return {
    kind: "pickup",
    requestId: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    pickupAddress: row.pickup_address,
    routeWindow: row.route_window,
    routeArea: row.route_area,
    notes: row.notes,
    estimatedWeightKg: row.estimated_weight_kg,
    estimatedPoints: row.estimated_points,
    selectedItems: readSelectedItems(row.selected_items),
  };
}

function toCenterDropoffSubmission(row: CenterDropoffRow): MemberRouteSubmission {
  return {
    kind: "center_dropoff",
    requestId: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    centerId: row.center_id,
    centerName: row.center_name,
    centerAddress: row.center_address,
    centerTownship: row.center_township,
    centerHours: row.center_hours,
    notes: row.notes,
    estimatedWeightKg: row.estimated_weight_kg,
    estimatedPoints: row.estimated_points,
    selectedItems: readSelectedItems(row.selected_items),
  };
}

function submittedBy(profile: ProfileRow | undefined) {
  return {
    displayName: profile?.display_name ?? "Unknown member",
    email: profile?.email ?? "unknown@example.com",
  };
}

export class RecyclingRouteRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getCurrentUser() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    return user;
  }

  async ensureCurrentProfile(user: User) {
    if (!user.email) throw new Error("Your Supabase account needs a primary email.");
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "ensure_current_profile",
      args: { profile_display_name: string; profile_email: string },
    ) => RpcResult<EnsureProfileRow[]>;
    const { data, error } = await rpc("ensure_current_profile", {
      profile_display_name: readDisplayName(user),
      profile_email: user.email,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "Your EcoLink profile could not be prepared.");
    return data[0];
  }

  async isCurrentUserAdmin() {
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (name: "current_profile_is_admin") => RpcResult<boolean>;
    const { data, error } = await rpc("current_profile_is_admin");
    if (error) throw new Error(error.message);
    return data === true;
  }

  async getCurrentSubmission(profileId: string): Promise<MemberRouteSubmission | null> {
    const { data: locks, error: lockError } = await this.supabase
      .from("recycling_route_submission_locks")
      .select("*")
      .eq("profile_id", profileId)
      .limit(1);
    if (lockError) throw new Error(lockError.message);
    const lock = (locks?.[0] ?? null) as RouteLockRow | null;
    if (!lock) return null;

    if (lock.route_type === "pickup") {
      const { data, error } = await this.supabase
        .from("recycling_pickup_requests")
        .select("*")
        .eq("id", lock.request_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toPickupSubmission(data as PickupRow) : null;
    }

    const { data, error } = await this.supabase
      .from("recycling_center_dropoff_requests")
      .select("*")
      .eq("id", lock.request_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCenterDropoffSubmission(data as CenterDropoffRow) : null;
  }

  async submitRouteRequest(input: SubmitRouteRequestInput): Promise<RouteSubmitResult> {
    if (input.type === "pickup") {
      const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
        name: "submit_recycling_pickup_request",
        args: Database["public"]["Functions"]["submit_recycling_pickup_request"]["Args"],
      ) => RpcResult<Database["public"]["Functions"]["submit_recycling_pickup_request"]["Returns"]>;
      const { data, error } = await rpc("submit_recycling_pickup_request", {
        pickup_address: input.pickupAddress,
        route_window: input.routeWindow,
        route_area: input.routeArea,
        selected_items: selectedItemsToJson(input.selectedItems),
        estimated_weight_kg: input.estimatedWeightKg,
        estimated_points: input.estimatedPoints,
        request_notes: input.notes ?? null,
      });
      if (error || !data?.[0]) throw new Error(error?.message ?? "The pickup request could not be submitted.");
      return { requestId: data[0].request_id, status: data[0].status, createdAt: data[0].created_at };
    }

    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "submit_recycling_center_dropoff_request",
      args: Database["public"]["Functions"]["submit_recycling_center_dropoff_request"]["Args"],
    ) => RpcResult<Database["public"]["Functions"]["submit_recycling_center_dropoff_request"]["Returns"]>;
    const { data, error } = await rpc("submit_recycling_center_dropoff_request", {
      target_center_id: input.centerId,
      center_name: input.centerName,
      center_address: input.centerAddress,
      center_township: input.centerTownship,
      center_hours: input.centerHours,
      selected_items: selectedItemsToJson(input.selectedItems),
      estimated_weight_kg: input.estimatedWeightKg,
      estimated_points: input.estimatedPoints,
      request_notes: input.notes ?? null,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "The center drop-off request could not be submitted.");
    return { requestId: data[0].request_id, status: data[0].status, createdAt: data[0].created_at };
  }

  async listAdminRequests() {
    const [pickupResult, centerResult] = await Promise.all([
      this.supabase
        .from("recycling_pickup_requests")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      this.supabase
        .from("recycling_center_dropoff_requests")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    if (pickupResult.error) throw new Error(pickupResult.error.message);
    if (centerResult.error) throw new Error(centerResult.error.message);

    const pickups = (pickupResult.data ?? []) as PickupRow[];
    const centerDropoffs = (centerResult.data ?? []) as CenterDropoffRow[];
    const profileIds = [...new Set([...pickups, ...centerDropoffs].map((request) => request.profile_id))];
    const profileMap = new Map<string, ProfileRow>();
    if (profileIds.length > 0) {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", profileIds);
      if (error) throw new Error(error.message);
      for (const profile of (data ?? []) as ProfileRow[]) profileMap.set(profile.id, profile);
    }

    return {
      pickups: pickups.map((row): AdminPickupRouteRequest => ({
        ...(toPickupSubmission(row) as Extract<MemberRouteSubmission, { kind: "pickup" }>),
        submittedBy: submittedBy(profileMap.get(row.profile_id)),
      })),
      centerDropoffs: centerDropoffs.map((row): AdminCenterDropoffRouteRequest => ({
        ...(toCenterDropoffSubmission(row) as Extract<MemberRouteSubmission, { kind: "center_dropoff" }>),
        submittedBy: submittedBy(profileMap.get(row.profile_id)),
      })),
    };
  }

  async updatePickupRequest(requestId: string, input: UpdatePickupRouteRequestInput) {
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "admin_update_recycling_pickup_request",
      args: Database["public"]["Functions"]["admin_update_recycling_pickup_request"]["Args"],
    ) => RpcResult<string>;
    const { error } = await rpc("admin_update_recycling_pickup_request", {
      target_request_id: requestId,
      next_status: input.status,
      next_pickup_address: input.pickupAddress,
      next_route_window: input.routeWindow,
      next_route_area: input.routeArea,
      next_notes: input.notes ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async updateCenterDropoffRequest(requestId: string, input: UpdateCenterDropoffRouteRequestInput) {
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "admin_update_recycling_center_dropoff_request",
      args: Database["public"]["Functions"]["admin_update_recycling_center_dropoff_request"]["Args"],
    ) => RpcResult<string>;
    const { error } = await rpc("admin_update_recycling_center_dropoff_request", {
      target_request_id: requestId,
      next_status: input.status,
      next_center_name: input.centerName,
      next_center_address: input.centerAddress,
      next_center_township: input.centerTownship,
      next_center_hours: input.centerHours,
      next_notes: input.notes ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async deletePickupRequest(requestId: string) {
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "admin_delete_recycling_pickup_request",
      args: { target_request_id: string },
    ) => RpcResult<string>;
    const { error } = await rpc("admin_delete_recycling_pickup_request", { target_request_id: requestId });
    if (error) throw new Error(error.message);
  }

  async deleteCenterDropoffRequest(requestId: string) {
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "admin_delete_recycling_center_dropoff_request",
      args: { target_request_id: string },
    ) => RpcResult<string>;
    const { error } = await rpc("admin_delete_recycling_center_dropoff_request", { target_request_id: requestId });
    if (error) throw new Error(error.message);
  }
}
