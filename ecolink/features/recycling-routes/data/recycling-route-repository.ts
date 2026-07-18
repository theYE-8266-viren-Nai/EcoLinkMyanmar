import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { SubmitRouteRequestInput, UpdateCenterDropoffRouteRequestInput, UpdatePickupRouteRequestInput } from "@/features/recycling-routes/schemas/recycling-route";
import type {
  AdminCenterDropoffRouteRequest,
  AdminPickupRoutingDashboard,
  AdminPickupRouteRequest,
  MemberRouteSubmission,
  PickupRouteAssignment,
  PickupRouteStop,
  PickupSchedule,
  RouteSubmitResult,
  SelectedRecyclingItem,
} from "@/features/recycling-routes/types";
import { selectedItemsToJson } from "@/features/recycling-routes/types";
import { PICKUP_ROUTE_DEPOTS, type PlannedLoop, type RoutablePickup } from "@/features/recycling-routes/utils/two-loop-planner";
import type { Database, Json } from "@/lib/database.types";

type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "display_name" | "email">;
type PickupRow = Database["public"]["Tables"]["recycling_pickup_requests"]["Row"];
type CenterDropoffRow = Database["public"]["Tables"]["recycling_center_dropoff_requests"]["Row"];
type RouteLockRow = Database["public"]["Tables"]["recycling_route_submission_locks"]["Row"];
type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;
type RouteDatabase = {
  public: {
    Tables: Pick<Database["public"]["Tables"], "pickup_schedules" | "pickup_route_plans" | "pickup_route_stops">;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Pick<Database["public"]["Enums"], "pickup_schedule_status" | "pickup_route_plan_status">;
    CompositeTypes: Record<string, never>;
  };
};

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

function toPickupSubmission(row: PickupRow, routeAssignment: PickupRouteAssignment | null = null): MemberRouteSubmission {
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
    scheduleId: row.schedule_id,
    latitude: row.latitude,
    longitude: row.longitude,
    routeAssignment,
    notes: row.notes,
    estimatedWeightKg: row.estimated_weight_kg,
    estimatedPoints: row.estimated_points,
    selectedItems: readSelectedItems(row.selected_items),
  };
}

function toSchedule(row: Database["public"]["Tables"]["pickup_schedules"]["Row"]): PickupSchedule {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    routeArea: row.route_area,
    status: row.status,
  };
}

function readRouteGeometry(value: Json): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((coordinate) => Array.isArray(coordinate)
    && typeof coordinate[0] === "number"
    && typeof coordinate[1] === "number"
    ? [[coordinate[0], coordinate[1]] as [number, number]]
    : []);
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

  private get routeSupabase() {
    return this.supabase as unknown as SupabaseClient<RouteDatabase>;
  }

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

  async getUpcomingSchedule(): Promise<PickupSchedule> {
    const rpc = this.supabase.rpc.bind(this.supabase) as unknown as (
      name: "get_or_create_next_pickup_schedule",
      args?: { reference_time?: string },
    ) => RpcResult<Database["public"]["Tables"]["pickup_schedules"]["Row"][]>;
    const { data, error } = await rpc("get_or_create_next_pickup_schedule");
    if (error || !data?.[0]) throw new Error(error?.message ?? "The next pickup schedule could not be prepared.");
    return toSchedule(data[0]);
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
      if (!data) return null;
      const { data: stop, error: stopError } = await this.routeSupabase
        .from("pickup_route_stops")
        .select("route_code,stop_order,estimated_arrival_at")
        .eq("pickup_request_id", lock.request_id)
        .maybeSingle();
      if (stopError) throw new Error(stopError.message);
      const assignment = stop ? {
        routeCode: stop.route_code,
        stopOrder: stop.stop_order,
        estimatedArrivalAt: stop.estimated_arrival_at,
      } satisfies PickupRouteAssignment : null;
      return toPickupSubmission(data as PickupRow, assignment);
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
        target_schedule_id: input.scheduleId,
        pickup_latitude: input.latitude,
        pickup_longitude: input.longitude,
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
    const [pickupResult, centerResult, stopsResult] = await Promise.all([
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
      this.routeSupabase.from("pickup_route_stops").select("pickup_request_id,route_code,stop_order,estimated_arrival_at"),
    ]);
    if (pickupResult.error) throw new Error(pickupResult.error.message);
    if (centerResult.error) throw new Error(centerResult.error.message);
    if (stopsResult.error) throw new Error(stopsResult.error.message);

    const pickups = (pickupResult.data ?? []) as PickupRow[];
    const centerDropoffs = (centerResult.data ?? []) as CenterDropoffRow[];
    const profileIds = [...new Set([...pickups, ...centerDropoffs].map((request) => request.profile_id))];
    const profileMap = new Map<string, ProfileRow>();
    const stopMap = new Map((stopsResult.data ?? []).map((stop) => [stop.pickup_request_id, {
      routeCode: stop.route_code,
      stopOrder: stop.stop_order,
      estimatedArrivalAt: stop.estimated_arrival_at,
    } satisfies PickupRouteAssignment]));
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
        ...(toPickupSubmission(row, stopMap.get(row.id) ?? null) as Extract<MemberRouteSubmission, { kind: "pickup" }>),
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
      next_schedule_id: input.scheduleId,
      next_latitude: input.latitude,
      next_longitude: input.longitude,
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

  async listAcceptedRoutablePickups(scheduleId: string): Promise<RoutablePickup[]> {
    const { data, error } = await this.supabase
      .from("recycling_pickup_requests")
      .select("*")
      .eq("schedule_id", scheduleId)
      .eq("status", "ACCEPTED")
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return ((data ?? []) as PickupRow[]).flatMap((row) => row.latitude === null || row.longitude === null ? [] : [{
      requestId: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
    }]);
  }

  async saveDraftLoops(schedule: PickupSchedule, loops: PlannedLoop[]) {
    const generatedAt = new Date().toISOString();
    const planIds = new Map<"A" | "B", string>();
    const savedPlans = await Promise.all(loops.map(async (loop) => {
      const { data: existing, error: existingError } = await this.routeSupabase
        .from("pickup_route_plans")
        .select("id,plan_version,status")
        .eq("schedule_id", schedule.id)
        .eq("route_code", loop.routeCode)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.status === "DISPATCHED") throw new Error("Dispatched pickup routes must be unlocked before replanning.");
      const { data: plan, error: planError } = await this.routeSupabase
        .from("pickup_route_plans")
        .upsert({
          schedule_id: schedule.id,
          route_code: loop.routeCode,
          center_id: loop.centerId,
          center_name: loop.centerName,
          center_latitude: loop.coordinate[1],
          center_longitude: loop.coordinate[0],
          status: "DRAFT",
          geometry: loop.geometry,
          distance_meters: loop.distanceMeters,
          duration_seconds: loop.durationSeconds,
          plan_version: (existing?.plan_version ?? 0) + 1,
          generation_error: null,
          generated_at: generatedAt,
          updated_at: generatedAt,
        }, { onConflict: "schedule_id,route_code" })
        .select("id")
        .single();
      if (planError || !plan) throw new Error(planError?.message ?? "The pickup loop could not be saved.");
      return [loop.routeCode, plan.id] as const;
    }));
    for (const [routeCode, planId] of savedPlans) planIds.set(routeCode, planId);

    const { error: deleteError } = await this.routeSupabase.from("pickup_route_stops").delete().eq("schedule_id", schedule.id);
    if (deleteError) throw new Error(deleteError.message);
    const stops = loops.flatMap((loop) => {
      const planId = planIds.get(loop.routeCode);
      if (!planId) return [];
      let elapsedSeconds = 0;
      return loop.pickups.map((pickup, index) => {
        elapsedSeconds += loop.legDurationsSeconds[index] ?? 0;
        const estimatedArrivalAt = new Date(new Date(schedule.startsAt).getTime() + (elapsedSeconds + index * 300) * 1000).toISOString();
        return {
          route_plan_id: planId,
          schedule_id: schedule.id,
          pickup_request_id: pickup.requestId,
          route_code: loop.routeCode,
          stop_order: index + 1,
          estimated_arrival_at: estimatedArrivalAt,
          latitude: pickup.latitude,
          longitude: pickup.longitude,
        };
      });
    });
    if (stops.length > 0) {
      const { error: stopsError } = await this.routeSupabase.from("pickup_route_stops").insert(stops);
      if (stopsError) throw new Error(stopsError.message);
    }
  }

  async markRouteGenerationError(scheduleId: string, message: string) {
    const now = new Date().toISOString();
    await Promise.all(PICKUP_ROUTE_DEPOTS.map(async (depot) => {
      const { data: existing, error: existingError } = await this.routeSupabase
        .from("pickup_route_plans")
        .select("id,status")
        .eq("schedule_id", scheduleId)
        .eq("route_code", depot.routeCode)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.status === "DISPATCHED") return;
      if (existing) {
        const { error } = await this.routeSupabase.from("pickup_route_plans").update({
          status: "ERROR",
          generation_error: message.slice(0, 500),
          updated_at: now,
        }).eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await this.routeSupabase.from("pickup_route_plans").insert({
          schedule_id: scheduleId,
          route_code: depot.routeCode,
          center_id: depot.centerId,
          center_name: depot.centerName,
          center_latitude: depot.coordinate[1],
          center_longitude: depot.coordinate[0],
          status: "ERROR",
          geometry: [depot.coordinate, depot.coordinate],
          generation_error: message.slice(0, 500),
          generated_at: now,
          updated_at: now,
        });
        if (error) throw new Error(error.message);
      }
    }));
  }

  async setRouteDispatchState(scheduleId: string, dispatched: boolean) {
    const now = new Date().toISOString();
    const { error: scheduleError } = await this.routeSupabase.from("pickup_schedules").update({
      status: dispatched ? "DISPATCHED" : "OPEN",
      dispatched_at: dispatched ? now : null,
      updated_at: now,
    }).eq("id", scheduleId);
    if (scheduleError) throw new Error(scheduleError.message);
    const { error: planError } = await this.routeSupabase.from("pickup_route_plans").update({
      status: dispatched ? "DISPATCHED" : "DRAFT",
      dispatched_at: dispatched ? now : null,
      updated_at: now,
    }).eq("schedule_id", scheduleId);
    if (planError) throw new Error(planError.message);
  }

  async getAdminRoutingDashboard(schedule: PickupSchedule): Promise<AdminPickupRoutingDashboard> {
    const [plansResult, stopsResult, pickupsResult] = await Promise.all([
      this.routeSupabase.from("pickup_route_plans").select("*").eq("schedule_id", schedule.id).order("route_code"),
      this.routeSupabase.from("pickup_route_stops").select("*").eq("schedule_id", schedule.id).order("stop_order"),
      this.supabase.from("recycling_pickup_requests").select("*").eq("schedule_id", schedule.id).is("deleted_at", null),
    ]);
    if (plansResult.error) throw new Error(plansResult.error.message);
    if (stopsResult.error) throw new Error(stopsResult.error.message);
    if (pickupsResult.error) throw new Error(pickupsResult.error.message);
    const pickupRows = (pickupsResult.data ?? []) as PickupRow[];
    const profileIds = [...new Set(pickupRows.map((pickup) => pickup.profile_id))];
    const { data: profiles, error: profilesError } = profileIds.length === 0
      ? { data: [] as ProfileRow[], error: null }
      : await this.supabase.from("profiles").select("id,display_name,email").in("id", profileIds);
    if (profilesError) throw new Error(profilesError.message);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const pickupMap = new Map(pickupRows.map((pickup) => [pickup.id, pickup]));
    const stopsByPlan = new Map<string, PickupRouteStop[]>();
    for (const stop of stopsResult.data ?? []) {
      const pickup = pickupMap.get(stop.pickup_request_id);
      if (!pickup) continue;
      const routeStop: PickupRouteStop = {
        pickupRequestId: pickup.id,
        pickupAddress: pickup.pickup_address,
        submittedBy: submittedBy(profileMap.get(pickup.profile_id)),
        stopOrder: stop.stop_order,
        estimatedArrivalAt: stop.estimated_arrival_at,
        latitude: stop.latitude,
        longitude: stop.longitude,
      };
      stopsByPlan.set(stop.route_plan_id, [...(stopsByPlan.get(stop.route_plan_id) ?? []), routeStop]);
    }
    const routedIds = new Set((stopsResult.data ?? []).map((stop) => stop.pickup_request_id));
    return {
      schedule,
      unroutableAcceptedCount: pickupRows.filter((pickup) => pickup.status === "ACCEPTED" && (!pickup.latitude || !pickup.longitude || !routedIds.has(pickup.id))).length,
      routes: (plansResult.data ?? []).map((plan) => ({
        id: plan.id,
        routeCode: plan.route_code,
        centerName: plan.center_name,
        centerLatitude: plan.center_latitude,
        centerLongitude: plan.center_longitude,
        status: plan.status,
        geometry: readRouteGeometry(plan.geometry),
        distanceMeters: plan.distance_meters,
        durationSeconds: plan.duration_seconds,
        planVersion: plan.plan_version,
        generationError: plan.generation_error,
        stops: stopsByPlan.get(plan.id) ?? [],
      })),
    };
  }
}
