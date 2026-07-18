import type { CollectorRoute, CollectorVehicleLocation, WasteType } from "@/features/live-map/types";
import type { WasteMapQuery } from "@/features/live-map/schemas/map";
import { getWasteMapMode, interpolateRoute, rowsToWasteMapResponse } from "@/features/live-map/utils/map-data";

interface DemoReport {
  id: string;
  longitude: number;
  latitude: number;
  score: number;
  wasteType: WasteType;
}

const DEMO_REPORTS: DemoReport[] = [
  { id: "demo-01", longitude: 96.128, latitude: 16.842, score: 7, wasteType: "PLASTIC" },
  { id: "demo-02", longitude: 96.131, latitude: 16.844, score: 8, wasteType: "MIXED" },
  { id: "demo-03", longitude: 96.134, latitude: 16.846, score: 9, wasteType: "PLASTIC" },
  { id: "demo-04", longitude: 96.137, latitude: 16.840, score: 6, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-05", longitude: 96.141, latitude: 16.837, score: 7, wasteType: "ORGANIC" },
  { id: "demo-06", longitude: 96.108, latitude: 16.889, score: 8, wasteType: "MIXED" },
  { id: "demo-07", longitude: 96.112, latitude: 16.893, score: 7, wasteType: "PLASTIC" },
  { id: "demo-08", longitude: 96.116, latitude: 16.886, score: 6, wasteType: "ORGANIC" },
  { id: "demo-09", longitude: 96.120, latitude: 16.897, score: 5, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-10", longitude: 96.105, latitude: 16.888, score: 8, wasteType: "PLASTIC" },
  { id: "demo-11", longitude: 96.144, latitude: 16.777, score: 9, wasteType: "MIXED" },
  { id: "demo-12", longitude: 96.148, latitude: 16.781, score: 8, wasteType: "PLASTIC" },
  { id: "demo-13", longitude: 96.153, latitude: 16.786, score: 8, wasteType: "PLASTIC" },
  { id: "demo-14", longitude: 96.158, latitude: 16.790, score: 7, wasteType: "ORGANIC" },
  { id: "demo-15", longitude: 96.162, latitude: 16.795, score: 6, wasteType: "GLASS" },
  { id: "demo-16", longitude: 96.172, latitude: 16.808, score: 7, wasteType: "METAL" },
  { id: "demo-17", longitude: 96.176, latitude: 16.812, score: 8, wasteType: "MIXED" },
  { id: "demo-18", longitude: 96.181, latitude: 16.817, score: 6, wasteType: "PLASTIC" },
  { id: "demo-19", longitude: 96.185, latitude: 16.822, score: 5, wasteType: "GLASS" },
  { id: "demo-20", longitude: 96.172, latitude: 16.829, score: 7, wasteType: "E_WASTE" },
  { id: "demo-21", longitude: 96.177, latitude: 16.832, score: 6, wasteType: "PLASTIC" },
  { id: "demo-22", longitude: 96.188, latitude: 16.851, score: 5, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-23", longitude: 96.194, latitude: 16.856, score: 7, wasteType: "MIXED" },
  { id: "demo-24", longitude: 96.201, latitude: 16.863, score: 6, wasteType: "E_WASTE" },
  { id: "demo-25", longitude: 96.207, latitude: 16.869, score: 5, wasteType: "PLASTIC" },
  { id: "demo-26", longitude: 96.089, latitude: 16.805, score: 7, wasteType: "MIXED" },
  { id: "demo-27", longitude: 96.096, latitude: 16.812, score: 6, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-28", longitude: 96.103, latitude: 16.817, score: 8, wasteType: "PLASTIC" },
  { id: "demo-29", longitude: 96.112, latitude: 16.801, score: 5, wasteType: "ORGANIC" },
  { id: "demo-30", longitude: 96.153, latitude: 16.821, score: 7, wasteType: "MIXED" },
  { id: "demo-31", longitude: 96.158, latitude: 16.826, score: 6, wasteType: "GLASS" },
  { id: "demo-32", longitude: 96.163, latitude: 16.832, score: 8, wasteType: "PLASTIC" },
  { id: "demo-33", longitude: 96.1291, latitude: 16.8424, score: 10, wasteType: "MIXED" },
  { id: "demo-34", longitude: 96.1298, latitude: 16.8429, score: 10, wasteType: "PLASTIC" },
  { id: "demo-35", longitude: 96.1304, latitude: 16.8432, score: 9, wasteType: "MIXED" },
  { id: "demo-36", longitude: 96.1296, latitude: 16.8438, score: 10, wasteType: "MIXED" },
  { id: "demo-37", longitude: 96.1309, latitude: 16.8441, score: 9, wasteType: "PLASTIC" },
  { id: "demo-38", longitude: 96.1315, latitude: 16.8445, score: 10, wasteType: "ORGANIC" },
  { id: "demo-39", longitude: 96.1307, latitude: 16.8417, score: 9, wasteType: "MIXED" },
  { id: "demo-40", longitude: 96.1299, latitude: 16.8411, score: 10, wasteType: "PLASTIC" },
  { id: "demo-41", longitude: 96.1308, latitude: 16.8408, score: 9, wasteType: "MIXED" },
  { id: "demo-42", longitude: 96.1318, latitude: 16.8419, score: 10, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-43", longitude: 96.1322, latitude: 16.8427, score: 9, wasteType: "MIXED" },
  { id: "demo-44", longitude: 96.1325, latitude: 16.8435, score: 10, wasteType: "PLASTIC" },
  { id: "demo-45", longitude: 96.1320, latitude: 16.8442, score: 9, wasteType: "MIXED" },
  { id: "demo-46", longitude: 96.1302, latitude: 16.8450, score: 10, wasteType: "MIXED" },
  { id: "demo-47", longitude: 96.1310, latitude: 16.8453, score: 9, wasteType: "PLASTIC" },
  { id: "demo-48", longitude: 96.1289, latitude: 16.8403, score: 10, wasteType: "ORGANIC" },
  { id: "demo-49", longitude: 96.1297, latitude: 16.8400, score: 9, wasteType: "MIXED" },
  { id: "demo-50", longitude: 96.1323, latitude: 16.8407, score: 10, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-51", longitude: 96.1309, latitude: 16.8395, score: 9, wasteType: "MIXED" },
  { id: "demo-52", longitude: 96.1316, latitude: 16.8399, score: 10, wasteType: "PLASTIC" },
];

export const DEMO_COLLECTOR_ROUTES = [
  {
    vehicleId: "demo-collector-1",
    label: "Collector 12",
    centerId: "hlaing-ecopoint",
    route: [
      [96.120, 16.849],
      [96.124, 16.849],
      [96.128, 16.848],
      [96.132, 16.847],
      [96.136, 16.844],
      [96.140, 16.842],
      [96.143, 16.839],
      [96.140, 16.837],
      [96.136, 16.835],
      [96.131, 16.833],
      [96.127, 16.836],
      [96.123, 16.842],
    ] as Array<[number, number]>,
  },
  {
    vehicleId: "demo-collector-2",
    label: "Collector 07",
    centerId: "tamwe-community-dropoff",
    route: [
      [96.169, 16.806],
      [96.173, 16.807],
      [96.177, 16.809],
      [96.181, 16.812],
      [96.183, 16.816],
      [96.185, 16.820],
      [96.185, 16.823],
      [96.182, 16.825],
      [96.178, 16.827],
      [96.173, 16.829],
      [96.171, 16.824],
      [96.170, 16.816],
    ] as Array<[number, number]>,
  },
] as const;

const DEMO_ROUTE_COLORS = ["#087c78", "#0b5a8a"] as const;

export function createDemoCollectorRoutes(
  roadRoutes: ReadonlyMap<string, readonly [number, number][]> = new Map(),
): CollectorRoute[] {
  return DEMO_COLLECTOR_ROUTES.map((vehicle, index) => ({
    vehicleId: vehicle.vehicleId,
    coordinates: [...(roadRoutes.get(vehicle.vehicleId) ?? vehicle.route)],
    color: DEMO_ROUTE_COLORS[index] ?? "#087c78",
  }));
}

export function createDemoWasteResponse(query: WasteMapQuery) {
  const mode = getWasteMapMode(query.zoom);
  const reports = DEMO_REPORTS.filter((report) =>
    report.longitude >= query.west && report.longitude <= query.east
      && report.latitude >= query.south && report.latitude <= query.north
      && (!query.wasteType || report.wasteType === query.wasteType));

  if (mode === "reports") {
    return rowsToWasteMapResponse(reports.map((report) => ({
      mode,
      feature_id: report.id,
      geometry: { type: "Point", coordinates: [Number(report.longitude.toFixed(3)), Number(report.latitude.toFixed(3))] },
      properties: { score: report.score, wasteType: report.wasteType, status: "submitted", observedAt: new Date().toISOString(), demo: true },
    })), query.zoom);
  }

  const precision = 2;
  const buckets = new Map<string, DemoReport[]>();
  for (const report of reports) {
    const key = `${report.longitude.toFixed(precision)}:${report.latitude.toFixed(precision)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), report]);
  }

  const rows = Array.from(buckets.entries()).map(([key, bucket]) => {
    const longitude = bucket.reduce((total, report) => total + report.longitude, 0) / bucket.length;
    const latitude = bucket.reduce((total, report) => total + report.latitude, 0) / bucket.length;
    const averageScore = bucket.reduce((total, report) => total + report.score, 0) / bucket.length;
    return {
      mode,
      feature_id: key,
      geometry: { type: "Point" as const, coordinates: [longitude, latitude] as [number, number] },
      properties: { count: bucket.length, averageScore, demo: true },
    };
  });

  return rowsToWasteMapResponse(rows, query.zoom);
}

export function createDemoVehicles(
  elapsedMilliseconds: number,
  now = new Date(),
  roadRoutes: ReadonlyMap<string, readonly [number, number][]> = new Map(),
): CollectorVehicleLocation[] {
  return DEMO_COLLECTOR_ROUTES.map((vehicle, index) => {
    const route = roadRoutes.get(vehicle.vehicleId) ?? vehicle.route;
    const position = interpolateRoute([...route], elapsedMilliseconds + index * 9000, 168000);
    return {
      vehicleId: vehicle.vehicleId,
      label: vehicle.label,
      centerId: vehicle.centerId,
      longitude: position.coordinates[0],
      latitude: position.coordinates[1],
      heading: position.heading,
      speedKph: 18 + index * 4,
      status: index === 0 ? "collecting" : "en_route",
      observedAt: now.toISOString(),
      isDemo: true,
      vehicleIcon: "recycle-car",
    };
  });
}
