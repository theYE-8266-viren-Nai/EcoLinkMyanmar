import { describe, expect, it, vi } from "vitest";

import { handlePublishCollectorLocation } from "@/features/live-map/api/collector-location-handlers";

const validBody = {
  vehicleId: "10000000-0000-4000-8000-000000000001",
  latitude: 16.8409,
  longitude: 96.1561,
  heading: 42,
  speedKph: 18,
  status: "collecting",
  observedAt: new Date().toISOString(),
};

function request(body: unknown) {
  return new Request("https://ecolink.test/api/collector-vehicles/location", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/collector-vehicles/location", () => {
  it("rejects invalid coordinates and headings", async () => {
    const publish = vi.fn();
    const response = await handlePublishCollectorLocation(
      request({ ...validBody, latitude: 120, heading: 400 }),
      { publish },
    );
    expect(response.status).toBe(400);
    expect(publish).not.toHaveBeenCalled();
  });

  it("returns the authentication and authorization outcomes", async () => {
    const unauthenticated = await handlePublishCollectorLocation(request(validBody), {
      publish: vi.fn().mockResolvedValue({ ok: false, reason: "unauthenticated" }),
    });
    const forbidden = await handlePublishCollectorLocation(request(validBody), {
      publish: vi.fn().mockResolvedValue({ ok: false, reason: "forbidden" }),
    });
    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
  });

  it("accepts an authorized current location", async () => {
    const publish = vi.fn().mockResolvedValue({ ok: true });
    const response = await handlePublishCollectorLocation(request(validBody), { publish });
    expect(response.status).toBe(204);
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: validBody.vehicleId }));
  });
});
