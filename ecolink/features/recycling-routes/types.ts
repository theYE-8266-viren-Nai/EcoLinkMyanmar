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
