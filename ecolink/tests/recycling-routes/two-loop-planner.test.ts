import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { formatPickupSchedule, isSaturdayYangonSchedule } from "@/features/recycling-routes/utils/weekly-schedule";
import {
  assignPickupsToNearestDepot,
  generateTwoPickupLoops,
  orderStopsByRoadDuration,
  type RoadRoutingProvider,
  type RouteCoordinate,
} from "@/features/recycling-routes/utils/two-loop-planner";

const hlaingPickup = { requestId: "hlaing", latitude: 16.845, longitude: 96.132 };
const tamwePickup = { requestId: "tamwe", latitude: 16.811, longitude: 96.177 };

const provider: RoadRoutingProvider = {
  async durations(coordinates) {
    return coordinates.map((_, from) => coordinates.map((__, to) => Math.abs(from - to) * 10));
  },
  async directions(coordinates) {
    return {
      geometry: coordinates,
      distanceMeters: coordinates.length * 1000,
      durationSeconds: coordinates.length * 120,
      legDurationsSeconds: coordinates.slice(1).map(() => 120),
    };
  },
};

describe("weekly two-loop pickup planner", () => {
  it("recognizes and formats the Saturday 8–11 AM Yangon schedule", () => {
    const schedule = {
      startsAt: "2026-07-25T01:30:00.000Z",
      endsAt: "2026-07-25T04:30:00.000Z",
    };
    expect(isSaturdayYangonSchedule(schedule)).toBe(true);
    expect(formatPickupSchedule(schedule)).toContain("Sat, Jul 25");
  });

  it("assigns pickups to their nearest route center", () => {
    const assignments = assignPickupsToNearestDepot([hlaingPickup, tamwePickup]);
    expect(assignments.get("A")?.map((pickup) => pickup.requestId)).toEqual(["hlaing"]);
    expect(assignments.get("B")?.map((pickup) => pickup.requestId)).toEqual(["tamwe"]);
  });

  it("uses road durations to choose the deterministic next stop", () => {
    const durations = [
      [0, 30, 10],
      [30, 0, 5],
      [10, 5, 0],
    ];
    expect(orderStopsByRoadDuration([hlaingPickup, tamwePickup], durations).map((pickup) => pickup.requestId)).toEqual(["tamwe", "hlaing"]);
  });

  it("generates two closed loops, including an empty depot loop", async () => {
    const loops = await generateTwoPickupLoops([hlaingPickup], provider);
    expect(loops).toHaveLength(2);
    for (const loop of loops) {
      expect(loop.geometry[0]).toEqual(loop.coordinate);
      expect(loop.geometry.at(-1)).toEqual(loop.coordinate);
    }
    expect(loops.find((loop) => loop.routeCode === "B")?.pickups).toEqual([]);
  });

  it("preserves the exact road geometry returned by the provider", async () => {
    const roadGeometry: RouteCoordinate[] = [[96.13, 16.84], [96.14, 16.85], [96.13, 16.84]];
    const customProvider: RoadRoutingProvider = {
      ...provider,
      async directions() {
        return { geometry: roadGeometry, distanceMeters: 2500, durationSeconds: 600, legDurationsSeconds: [300, 300] };
      },
    };
    const loop = (await generateTwoPickupLoops([hlaingPickup], customProvider))[0];
    expect(loop.geometry).toEqual(roadGeometry);
  });

  it("renders route loops and numbered stops without vehicle animation", () => {
    const mapComponent = readFileSync(
      join(process.cwd(), "features", "recycling-routes", "components", "admin-pickup-loop-map.tsx"),
      "utf8",
    );
    expect(mapComponent).toContain("LineString");
    expect(mapComponent).toContain("stop.stopOrder");
    expect(mapComponent).not.toMatch(/requestAnimationFrame|setInterval|collector-vehicle|Truck/);
  });
});
