import { describe, expect, it, vi } from "vitest";

import { handleGetWasteMap } from "@/features/live-map/api/waste-map-handlers";

function request(query: string) {
  return new Request(`https://ecolink.test/api/map/waste?${query}`);
}

describe("GET /api/map/waste", () => {
  it("rejects missing and inverted map bounds", async () => {
    expect((await handleGetWasteMap(request("zoom=12"), { demoMode: false, loadRows: vi.fn() })).status).toBe(400);
    expect((await handleGetWasteMap(request("west=97&south=17&east=96&north=16&zoom=12"), { demoMode: false, loadRows: vi.fn() })).status).toBe(400);
  });

  it("passes validated filters to the data dependency", async () => {
    const loadRows = vi.fn().mockResolvedValue([]);
    const response = await handleGetWasteMap(
      request("west=96&south=16.7&east=96.3&north=17&zoom=13&window=7d&wasteType=PLASTIC"),
      { demoMode: false, loadRows, now: () => new Date("2026-07-18T12:00:00.000Z") },
    );

    expect(response.status).toBe(200);
    expect(loadRows).toHaveBeenCalledWith(expect.objectContaining({ zoom: 13, window: "7d", wasteType: "PLASTIC" }));
    await expect(response.json()).resolves.toMatchObject({ mode: "reports", data: { type: "FeatureCollection" } });
  });

  it("returns a safe service-unavailable error", async () => {
    const response = await handleGetWasteMap(
      request("west=96&south=16.7&east=96.3&north=17&zoom=17"),
      { demoMode: false, loadRows: vi.fn().mockRejectedValue(new Error("database secret")) },
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Waste density data is temporarily unavailable." });
  });
});
