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

  it("signs close-zoom report photos without returning raw storage paths", async () => {
    const loadRows = vi.fn().mockResolvedValue([{
      mode: "reports",
      feature_id: "report-1",
      geometry: { type: "Point", coordinates: [96.1, 16.8] },
      properties: {
        score: 9,
        wasteType: "MIXED",
        status: "PENDING",
        observedAt: "2026-07-18T12:00:00.000Z",
        photoStoragePath: "member/report.jpg",
      },
    }]);
    const createPhotoUrl = vi.fn().mockResolvedValue("https://signed.example/member/report.jpg");

    const response = await handleGetWasteMap(
      request("west=96&south=16.7&east=96.3&north=17&zoom=17"),
      { demoMode: false, loadRows, createPhotoUrl, now: () => new Date("2026-07-18T12:00:00.000Z") },
    );

    expect(response.status).toBe(200);
    expect(createPhotoUrl).toHaveBeenCalledWith("member/report.jpg");
    const body = await response.json();
    expect(body.data.features[0].properties).toEqual({
      score: 9,
      wasteType: "MIXED",
      status: "PENDING",
      observedAt: "2026-07-18T12:00:00.000Z",
      photoUrl: "https://signed.example/member/report.jpg",
    });
  });

  it("does not sign photos for aggregated heatmap responses", async () => {
    const createPhotoUrl = vi.fn();
    const response = await handleGetWasteMap(
      request("west=96&south=16.7&east=96.3&north=17&zoom=11"),
      {
        demoMode: false,
        createPhotoUrl,
        loadRows: vi.fn().mockResolvedValue([{
          mode: "heatmap",
          feature_id: "bucket-1",
          geometry: { type: "Point", coordinates: [96.1, 16.8] },
          properties: { count: 4, averageScore: 8, photoStoragePath: "private/report.jpg" },
        }]),
      },
    );

    expect(response.status).toBe(200);
    expect(createPhotoUrl).not.toHaveBeenCalled();
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
