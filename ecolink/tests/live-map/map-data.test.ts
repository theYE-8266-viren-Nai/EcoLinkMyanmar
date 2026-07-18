import { describe, expect, it } from "vitest";

import { createDemoWasteResponse, createDemoVehicles } from "@/features/live-map/data/demo-map-data";
import {
  getObservedSince,
  getVehicleFreshness,
  getWasteMapMode,
  interpolateRoute,
  rowsToWasteMapResponse,
} from "@/features/live-map/utils/map-data";

describe("live map data", () => {
  it("selects the required visualization at each zoom threshold", () => {
    expect(getWasteMapMode(11.99)).toBe("heatmap");
    expect(getWasteMapMode(12)).toBe("reports");
    expect(getWasteMapMode(14.99)).toBe("reports");
    expect(getWasteMapMode(15)).toBe("reports");
  });

  it("calculates stable time windows", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    expect(getObservedSince("24h", now)).toBe("2026-07-17T12:00:00.000Z");
    expect(getObservedSince("7d", now)).toBe("2026-07-11T12:00:00.000Z");
  });

  it("marks collector locations stale and hidden at the documented ages", () => {
    const now = new Date("2026-07-18T12:10:00.000Z").getTime();
    expect(getVehicleFreshness("2026-07-18T12:09:00.000Z", now)).toBe("live");
    expect(getVehicleFreshness("2026-07-18T12:07:59.000Z", now)).toBe("stale");
    expect(getVehicleFreshness("2026-07-18T12:00:00.000Z", now)).toBe("hidden");
  });

  it("interpolates demo routes and returns a valid heading", () => {
    const result = interpolateRoute([[96.1, 16.8], [96.2, 16.9]], 3500, 7000);
    expect(result.coordinates[0]).toBeCloseTo(96.15);
    expect(result.coordinates[1]).toBeCloseTo(16.85);
    expect(result.heading).toBeGreaterThanOrEqual(0);
    expect(result.heading).toBeLessThan(360);
  });

  it("removes private report properties at the API transformation boundary", () => {
    const response = rowsToWasteMapResponse([{
      mode: "reports",
      feature_id: "report-1",
      geometry: { type: "Point", coordinates: [96.1, 16.8] },
      properties: {
        score: 8,
        wasteType: "MIXED",
        status: "submitted",
        observedAt: "2026-07-18T12:00:00.000Z",
        notes: "private note",
        reporterProfileId: "private-id",
      },
    }], 17);

    expect(response.data.features[0].properties).toEqual({
      score: 8,
      wasteType: "MIXED",
      status: "submitted",
      observedAt: "2026-07-18T12:00:00.000Z",
    });
  });

  it("creates deterministic demo data for every map scale", () => {
    const baseQuery = { west: 96, south: 16.7, east: 96.3, north: 17, window: "30d" as const };
    expect(createDemoWasteResponse({ ...baseQuery, zoom: 11 }).mode).toBe("heatmap");
    expect(createDemoWasteResponse({ ...baseQuery, zoom: 13 }).mode).toBe("reports");
    expect(createDemoWasteResponse({ ...baseQuery, zoom: 17 }).mode).toBe("reports");
    expect(createDemoVehicles(1000)).toHaveLength(2);
  });

  it("keeps demo collector movement slow between map refreshes", () => {
    const [firstTick] = createDemoVehicles(1000);
    const [secondTick] = createDemoVehicles(2000);

    expect(Math.abs(secondTick.longitude - firstTick.longitude)).toBeLessThan(0.001);
    expect(Math.abs(secondTick.latitude - firstTick.latitude)).toBeLessThan(0.001);
  });
});
