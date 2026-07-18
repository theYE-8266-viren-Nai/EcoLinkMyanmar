import { z } from "zod";

const wasteTypes = [
  "MIXED",
  "PLASTIC",
  "PAPER_CARDBOARD",
  "METAL",
  "GLASS",
  "ORGANIC",
  "E_WASTE",
  "HAZARDOUS",
  "OTHER",
] as const;

const finiteNumber = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === null || value === "" ? undefined : value,
  z.coerce.number().finite().min(minimum).max(maximum),
);

export const wasteMapQuerySchema = z
  .object({
    west: finiteNumber(-180, 180),
    south: finiteNumber(-90, 90),
    east: finiteNumber(-180, 180),
    north: finiteNumber(-90, 90),
    zoom: finiteNumber(0, 22),
    window: z.enum(["24h", "7d", "30d"]).default("30d"),
    wasteType: z.enum(wasteTypes).optional(),
  })
  .refine((value) => value.west < value.east && value.south < value.north, {
    message: "The map bounds are invalid.",
  });

export const collectorLocationSchema = z
  .object({
    vehicleId: z.uuid(),
    latitude: finiteNumber(-90, 90),
    longitude: finiteNumber(-180, 180),
    heading: finiteNumber(0, 359.999999),
    speedKph: finiteNumber(0, 180),
    status: z.enum(["collecting", "en_route", "returning", "offline"]),
    observedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (value) => Math.abs(Date.now() - new Date(value.observedAt).getTime()) <= 5 * 60 * 1000,
    { message: "The observation time must be within five minutes of the server time." },
  );

const mapPointGeometrySchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]),
});

const mapPolygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.array(z.number()))),
});

export const wasteMapRpcRowsSchema = z.array(z.object({
  mode: z.string(),
  feature_id: z.string(),
  geometry: z.union([mapPointGeometrySchema, mapPolygonGeometrySchema]),
  properties: z.record(z.string(), z.unknown()),
}));

export type WasteMapQuery = z.infer<typeof wasteMapQuerySchema>;
export type CollectorLocationInput = z.infer<typeof collectorLocationSchema>;
