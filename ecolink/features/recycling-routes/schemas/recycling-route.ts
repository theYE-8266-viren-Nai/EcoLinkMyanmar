import { z } from "zod";

import { RECYCLING_ROUTE_STATUSES } from "@/features/recycling-routes/types";

export const selectedRecyclingItemSchema = z.object({
  itemType: z.string().trim().min(1).max(120),
  materialLabel: z.string().trim().min(1).max(120),
  materialSlug: z.string().trim().min(1).max(80).nullable(),
  estimatedCount: z.number().finite().min(0).max(10000),
  estimatedWeightKg: z.number().finite().min(0).max(500),
  estimatedPoints: z.number().finite().min(0).max(100000),
});

const routeBaseSchema = z.object({
  selectedItems: z.array(selectedRecyclingItemSchema).min(1).max(50),
  estimatedWeightKg: z.number().finite().min(0).max(500),
  estimatedPoints: z.number().finite().min(0).max(100000),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const submitPickupRouteSchema = routeBaseSchema.extend({
  type: z.literal("pickup"),
  pickupAddress: z.string().trim().min(6).max(500),
  routeWindow: z.string().trim().min(1).max(120),
  routeArea: z.string().trim().min(1).max(120),
});

export const submitCenterDropoffRouteSchema = routeBaseSchema.extend({
  type: z.literal("center_dropoff"),
  centerId: z.string().trim().min(1).max(120).nullable(),
  centerName: z.string().trim().min(1).max(180),
  centerAddress: z.string().trim().min(1).max(300),
  centerTownship: z.string().trim().min(1).max(120),
  centerHours: z.string().trim().min(1).max(120),
});

export const submitRouteRequestSchema = z.discriminatedUnion("type", [
  submitPickupRouteSchema,
  submitCenterDropoffRouteSchema,
]);

export const routeRequestIdSchema = z.uuid();

export const updatePickupRouteRequestSchema = z.object({
  status: z.enum(RECYCLING_ROUTE_STATUSES),
  pickupAddress: z.string().trim().min(6).max(500),
  routeWindow: z.string().trim().min(1).max(120),
  routeArea: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateCenterDropoffRouteRequestSchema = z.object({
  status: z.enum(RECYCLING_ROUTE_STATUSES),
  centerName: z.string().trim().min(1).max(180),
  centerAddress: z.string().trim().min(1).max(300),
  centerTownship: z.string().trim().min(1).max(120),
  centerHours: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type SubmitRouteRequestInput = z.infer<typeof submitRouteRequestSchema>;
export type UpdatePickupRouteRequestInput = z.infer<typeof updatePickupRouteRequestSchema>;
export type UpdateCenterDropoffRouteRequestInput = z.infer<typeof updateCenterDropoffRouteRequestSchema>;
