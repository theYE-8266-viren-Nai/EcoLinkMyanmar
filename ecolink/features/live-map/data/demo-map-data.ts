import type { CollectorVehicleLocation, WasteType } from "@/features/live-map/types";
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
  { id: "demo-02", longitude: 96.133, latitude: 16.846, score: 8, wasteType: "MIXED" },
  { id: "demo-03", longitude: 96.139, latitude: 16.837, score: 6, wasteType: "PAPER_CARDBOARD" },
  { id: "demo-04", longitude: 96.148, latitude: 16.779, score: 9, wasteType: "MIXED" },
  { id: "demo-05", longitude: 96.154, latitude: 16.786, score: 8, wasteType: "PLASTIC" },
  { id: "demo-06", longitude: 96.162, latitude: 16.793, score: 7, wasteType: "ORGANIC" },
  { id: "demo-07", longitude: 96.173, latitude: 16.812, score: 5, wasteType: "METAL" },
  { id: "demo-08", longitude: 96.18, latitude: 16.817, score: 6, wasteType: "MIXED" },
  { id: "demo-09", longitude: 96.171, latitude: 16.828, score: 4, wasteType: "GLASS" },
  { id: "demo-10", longitude: 96.105, latitude: 16.888, score: 8, wasteType: "PLASTIC" },
  { id: "demo-11", longitude: 96.112, latitude: 16.895, score: 7, wasteType: "MIXED" },
  { id: "demo-12", longitude: 96.119, latitude: 16.882, score: 6, wasteType: "ORGANIC" },
  { id: "demo-13", longitude: 96.203, latitude: 16.865, score: 5, wasteType: "E_WASTE" },
  { id: "demo-14", longitude: 96.192, latitude: 16.855, score: 4, wasteType: "PLASTIC" },
  { id: "demo-15", longitude: 96.089, latitude: 16.805, score: 7, wasteType: "MIXED" },
  { id: "demo-16", longitude: 96.096, latitude: 16.812, score: 6, wasteType: "PAPER_CARDBOARD" },
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

export function createDemoVehicles(elapsedMilliseconds: number, now = new Date()): CollectorVehicleLocation[] {
  return DEMO_COLLECTOR_ROUTES.map((vehicle, index) => {
    const position = interpolateRoute(vehicle.route, elapsedMilliseconds + index * 9000);
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
