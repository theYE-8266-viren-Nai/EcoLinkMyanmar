export type RouteCoordinate = [longitude: number, latitude: number];

export type RoutablePickup = {
  requestId: string;
  latitude: number;
  longitude: number;
};

export type RouteDepot = {
  routeCode: "A" | "B";
  centerId: string;
  centerName: string;
  coordinate: RouteCoordinate;
};

export type RouteDirections = {
  geometry: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  legDurationsSeconds: number[];
};

export type PlannedLoop = RouteDepot & RouteDirections & {
  pickups: RoutablePickup[];
};

export interface RoadRoutingProvider {
  durations(coordinates: RouteCoordinate[]): Promise<Array<Array<number | null>>>;
  directions(coordinates: RouteCoordinate[]): Promise<RouteDirections>;
}

export const PICKUP_ROUTE_DEPOTS: readonly RouteDepot[] = [
  {
    routeCode: "A",
    centerId: "10000000-0000-0000-0000-000000000001",
    centerName: "Hlaing EcoPoint",
    coordinate: [96.1305, 16.8436],
  },
  {
    routeCode: "B",
    centerId: "10000000-0000-0000-0000-000000000004",
    centerName: "Tamwe Community Drop-off",
    coordinate: [96.1761, 16.8103],
  },
] as const;

function squaredDistance(a: RouteCoordinate, b: RouteCoordinate) {
  const latitudeScale = Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
  const longitudeDelta = (a[0] - b[0]) * latitudeScale;
  const latitudeDelta = a[1] - b[1];
  return longitudeDelta * longitudeDelta + latitudeDelta * latitudeDelta;
}

export function assignPickupsToNearestDepot(
  pickups: RoutablePickup[],
  depots: readonly RouteDepot[] = PICKUP_ROUTE_DEPOTS,
) {
  const assignments = new Map(depots.map((depot) => [depot.routeCode, [] as RoutablePickup[]]));
  for (const pickup of pickups) {
    const coordinate: RouteCoordinate = [pickup.longitude, pickup.latitude];
    let nearest = depots[0];
    for (const depot of depots.slice(1)) {
      if (squaredDistance(coordinate, depot.coordinate) < squaredDistance(coordinate, nearest.coordinate)) nearest = depot;
    }
    assignments.get(nearest.routeCode)?.push(pickup);
  }
  return assignments;
}

export function orderStopsByRoadDuration(
  pickups: RoutablePickup[],
  durations: Array<Array<number | null>>,
) {
  const remaining = new Set(pickups.map((_, index) => index + 1));
  const ordered: RoutablePickup[] = [];
  let currentIndex = 0;
  while (remaining.size > 0) {
    let nextIndex: number | undefined;
    let nextDuration = Number.POSITIVE_INFINITY;
    for (const candidate of remaining) {
      const duration = durations[currentIndex]?.[candidate];
      if (duration !== null && duration !== undefined && duration < nextDuration) {
        nextDuration = duration;
        nextIndex = candidate;
      }
    }
    nextIndex ??= Math.min(...remaining);
    ordered.push(pickups[nextIndex - 1]);
    remaining.delete(nextIndex);
    currentIndex = nextIndex;
  }
  return ordered;
}

export async function generateTwoPickupLoops(
  pickups: RoutablePickup[],
  provider: RoadRoutingProvider,
  depots: readonly RouteDepot[] = PICKUP_ROUTE_DEPOTS,
): Promise<PlannedLoop[]> {
  const assignments = assignPickupsToNearestDepot(pickups, depots);
  return Promise.all(depots.map(async (depot) => {
    const assigned = assignments.get(depot.routeCode) ?? [];
    if (assigned.length === 0) {
      return { ...depot, pickups: [], geometry: [depot.coordinate, depot.coordinate], distanceMeters: 0, durationSeconds: 0, legDurationsSeconds: [] };
    }
    const matrixCoordinates = [depot.coordinate, ...assigned.map((pickup) => [pickup.longitude, pickup.latitude] as RouteCoordinate)];
    const matrix = await provider.durations(matrixCoordinates);
    const ordered = orderStopsByRoadDuration(assigned, matrix);
    const loopCoordinates = [
      depot.coordinate,
      ...ordered.map((pickup) => [pickup.longitude, pickup.latitude] as RouteCoordinate),
      depot.coordinate,
    ];
    const directions = await provider.directions(loopCoordinates);
    return { ...depot, ...directions, pickups: ordered };
  }));
}
