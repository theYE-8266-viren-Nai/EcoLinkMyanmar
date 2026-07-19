import type { RoadRoutingProvider, RouteCoordinate, RouteDirections } from "@/features/recycling-routes/utils/two-loop-planner";

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: unknown };
    legs?: Array<{ duration?: number }>;
  }>;
};

type MapboxMatrixResponse = { durations?: Array<Array<number | null>> };

/**
 * Mapbox routing profile.  "driving" works globally; "driving-traffic" adds
 * real-time traffic but is unavailable in many regions (returns 422 in Yangon).
 */
const MAPBOX_PROFILE = "driving";

function accessToken() {
  const token = process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("Mapbox routing is not configured. Add MAPBOX_ACCESS_TOKEN.");
  return token;
}

function coordinatePath(coordinates: RouteCoordinate[]) {
  return coordinates.map(([longitude, latitude]) => `${longitude},${latitude}`).join(";");
}

function validGeometry(value: unknown): value is RouteCoordinate[] {
  return Array.isArray(value) && value.every((coordinate) =>
    Array.isArray(coordinate)
    && coordinate.length >= 2
    && typeof coordinate[0] === "number"
    && typeof coordinate[1] === "number");
}

function approximateMatrix(coordinates: RouteCoordinate[]) {
  return coordinates.map(([fromLongitude, fromLatitude]) => coordinates.map(([toLongitude, toLatitude]) => {
    const longitudeDelta = (fromLongitude - toLongitude) * Math.cos(((fromLatitude + toLatitude) / 2) * Math.PI / 180);
    const latitudeDelta = fromLatitude - toLatitude;
    return Math.hypot(longitudeDelta, latitudeDelta) * 111_000 / 8.33;
  }));
}

async function readMapboxError(response: Response, label: string): Promise<string> {
  try {
    const body = await response.json() as { message?: string; code?: string };
    const detail = body.message || body.code || "";
    return `${label} (${response.status})${detail ? `: ${detail}` : "."}`;
  } catch {
    return `${label} (${response.status}).`;
  }
}

async function fetchDirectionSegment(coordinates: RouteCoordinate[]): Promise<RouteDirections> {
  const query = new URLSearchParams({
    access_token: accessToken(),
    geometries: "geojson",
    overview: "full",
    steps: "false",
  });
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${MAPBOX_PROFILE}/${coordinatePath(coordinates)}?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(await readMapboxError(response, "Mapbox directions failed"));
  const body = await response.json() as MapboxDirectionsResponse;
  const route = body.routes?.[0];
  if (!route || !validGeometry(route.geometry?.coordinates)) throw new Error("Mapbox returned an invalid loop route.");
  return {
    geometry: route.geometry.coordinates,
    distanceMeters: route.distance ?? 0,
    durationSeconds: route.duration ?? 0,
    legDurationsSeconds: route.legs?.map((leg) => leg.duration ?? 0) ?? [],
  };
}

export const mapboxRoadRoutingProvider: RoadRoutingProvider = {
  async durations(coordinates) {
    if (coordinates.length < 2) return coordinates.map(() => coordinates.map(() => 0));
    if (coordinates.length > 25) return approximateMatrix(coordinates);
    const query = new URLSearchParams({ access_token: accessToken(), annotations: "duration" });
    const response = await fetch(`https://api.mapbox.com/directions-matrix/v1/mapbox/${MAPBOX_PROFILE}/${coordinatePath(coordinates)}?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(await readMapboxError(response, "Mapbox distance matrix failed"));
    const body = await response.json() as MapboxMatrixResponse;
    if (!body.durations || body.durations.length !== coordinates.length) throw new Error("Mapbox returned an invalid distance matrix.");
    return body.durations;
  },
  async directions(coordinates) {
    if (coordinates.length < 2) {
      return { geometry: coordinates, distanceMeters: 0, durationSeconds: 0, legDurationsSeconds: [] };
    }
    const segments: RouteCoordinate[][] = [];
    for (let start = 0; start < coordinates.length - 1; start += 24) {
      segments.push(coordinates.slice(start, Math.min(start + 25, coordinates.length)));
    }
    const results = await Promise.all(segments.map(fetchDirectionSegment));
    return results.reduce<RouteDirections>((combined, route, index) => ({
      geometry: [...combined.geometry, ...(index === 0 ? route.geometry : route.geometry.slice(1))],
      distanceMeters: combined.distanceMeters + route.distanceMeters,
      durationSeconds: combined.durationSeconds + route.durationSeconds,
      legDurationsSeconds: [...combined.legDurationsSeconds, ...route.legDurationsSeconds],
    }), { geometry: [], distanceMeters: 0, durationSeconds: 0, legDurationsSeconds: [] });
  },
};

