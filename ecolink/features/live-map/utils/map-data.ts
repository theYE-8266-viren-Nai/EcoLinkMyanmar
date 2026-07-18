import type {
  CollectorVehicleLocation,
  MapFeatureCollection,
  WasteMapMode,
  WasteMapResponse,
  WasteMapRpcRow,
  WasteWindow,
} from "@/features/live-map/types";

export const YANGON_CENTER: [number, number] = [96.1561, 16.8409];
export const YANGON_ZOOM = 11.5;
export const YANGON_BOUNDS: [[number, number], [number, number]] = [
  [95.82, 16.55],
  [96.42, 17.15],
];

const WINDOW_MILLISECONDS: Record<WasteWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function getWasteMapMode(zoom: number): WasteMapMode {
  if (zoom < 12) return "heatmap";
  return "reports";
}

export function getObservedSince(window: WasteWindow, now = new Date()) {
  return new Date(now.getTime() - WINDOW_MILLISECONDS[window]).toISOString();
}

export function rowsToWasteMapResponse(
  rows: WasteMapRpcRow[],
  zoom: number,
  generatedAt = new Date().toISOString(),
): WasteMapResponse {
  const mode = getWasteMapMode(zoom);
  const data: MapFeatureCollection = {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      id: row.feature_id,
      geometry: row.geometry,
      properties: mode === "reports"
        ? {
            score: Number(row.properties.score ?? 0),
            wasteType: String(row.properties.wasteType ?? "OTHER"),
            status: String(row.properties.status ?? "submitted"),
            observedAt: String(row.properties.observedAt ?? generatedAt),
            ...(row.properties.demo === true ? { demo: true } : {}),
          }
        : {
            count: Number(row.properties.count ?? 0),
            averageScore: Number(row.properties.averageScore ?? 0),
            ...(row.properties.demo === true ? { demo: true } : {}),
          },
    })),
  };

  return { mode, data, generatedAt };
}

export function getVehicleFreshness(observedAt: string, now = Date.now()) {
  const age = Math.max(0, now - new Date(observedAt).getTime());
  if (age >= 10 * 60 * 1000) return "hidden" as const;
  if (age >= 2 * 60 * 1000) return "stale" as const;
  return "live" as const;
}

export function interpolateRoute(
  route: Array<[number, number]>,
  elapsedMilliseconds: number,
  segmentDuration = 14000,
) {
  if (route.length < 2) return { coordinates: route[0] ?? YANGON_CENTER, heading: 0 };
  const progress = elapsedMilliseconds / segmentDuration;
  const fromIndex = Math.floor(progress) % route.length;
  const toIndex = (fromIndex + 1) % route.length;
  const fraction = progress - Math.floor(progress);
  const from = route[fromIndex];
  const to = route[toIndex];
  const longitude = from[0] + (to[0] - from[0]) * fraction;
  const latitude = from[1] + (to[1] - from[1]) * fraction;
  const heading = (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;

  return {
    coordinates: [longitude, latitude] as [number, number],
    heading: (heading + 360) % 360,
  };
}

export function vehiclesToFeatureCollection(vehicles: CollectorVehicleLocation[], now = Date.now()) {
  const features = vehicles.flatMap((vehicle) => {
    const freshness = getVehicleFreshness(vehicle.observedAt, now);
    if (freshness === "hidden") return [];
    return [{
      type: "Feature" as const,
      id: vehicle.vehicleId,
      geometry: {
        type: "Point" as const,
        coordinates: [vehicle.longitude, vehicle.latitude] as [number, number],
      },
      properties: { vehicleIcon: "recycle-car", ...vehicle, freshness },
    }];
  });

  return { type: "FeatureCollection" as const, features };
}
