import type { Json } from "@/lib/database.types";

export const RECYCLING_ROUTE_STATUSES = ["PENDING", "ACCEPTED", "COMPLETED", "CANCELLED", "REJECTED"] as const;

export type RecyclingRouteStatus = (typeof RECYCLING_ROUTE_STATUSES)[number];

export type SelectedRecyclingItem = {
  itemType: string;
  materialLabel: string;
  materialSlug: string | null;
  estimatedCount: number;
  estimatedWeightKg: number;
  estimatedPoints: number;
};

export type RouteSubmitResult = {
  requestId: string;
  status: RecyclingRouteStatus;
  createdAt: string;
};

export type PickupSchedule = {
  id: string;
  startsAt: string;
  endsAt: string;
  routeArea: string;
  status: "OPEN" | "DISPATCHED" | "COMPLETED";
};

export type PickupRouteAssignment = {
  routeCode: "A" | "B";
  stopOrder: number;
  estimatedArrivalAt: string | null;
};

export type PickupRouteStop = {
  pickupRequestId: string;
  pickupAddress: string;
  submittedBy: SubmittedBy;
  stopOrder: number;
  estimatedArrivalAt: string | null;
  latitude: number;
  longitude: number;
};

export type PickupLoopRoute = {
  id: string;
  routeCode: "A" | "B";
  centerName: string;
  centerLatitude: number;
  centerLongitude: number;
  status: "DRAFT" | "ERROR" | "DISPATCHED";
  geometry: Array<[number, number]>;
  distanceMeters: number;
  durationSeconds: number;
  planVersion: number;
  generationError: string | null;
  stops: PickupRouteStop[];
};

export type AdminPickupRoutingDashboard = {
  schedule: PickupSchedule;
  routes: PickupLoopRoute[];
  unroutableAcceptedCount: number;
};

export type MemberRouteSubmission =
  | {
      kind: "pickup";
      requestId: string;
      status: RecyclingRouteStatus;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      pickupAddress: string;
      routeWindow: string;
      routeArea: string;
      scheduleId: string | null;
      latitude: number | null;
      longitude: number | null;
      routeAssignment: PickupRouteAssignment | null;
      notes: string | null;
      estimatedWeightKg: number;
      estimatedPoints: number;
      selectedItems: SelectedRecyclingItem[];
    }
  | {
      kind: "center_dropoff";
      requestId: string;
      status: RecyclingRouteStatus;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      centerId: string | null;
      centerName: string;
      centerAddress: string;
      centerTownship: string;
      centerHours: string;
      notes: string | null;
      estimatedWeightKg: number;
      estimatedPoints: number;
      selectedItems: SelectedRecyclingItem[];
    };

export type SubmittedBy = {
  displayName: string;
  email: string;
};

export type AdminPickupRouteRequest = Extract<MemberRouteSubmission, { kind: "pickup" }> & {
  submittedBy: SubmittedBy;
};

export type AdminCenterDropoffRouteRequest = Extract<MemberRouteSubmission, { kind: "center_dropoff" }> & {
  submittedBy: SubmittedBy;
};

export type AdminRouteRequestList = {
  pickups: AdminPickupRouteRequest[];
  centerDropoffs: AdminCenterDropoffRouteRequest[];
};

export function selectedItemsToJson(items: SelectedRecyclingItem[]): Json {
  return items.map((item) => ({ ...item }));
}
