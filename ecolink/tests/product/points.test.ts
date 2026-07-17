import { describe, expect, it } from "vitest";

import { DEMO_MEMBER_CODE, PARTNER_CENTERS, STAFF_CENTER_ID, calculatePoints } from "@/lib/ecolink-data";

describe("center-scoped point calculation", () => {
  it("uses the configured material rate", () => {
    expect(calculatePoints("pet-plastic", 3)).toBe(150);
    expect(calculatePoints("e-waste", 2)).toBe(160);
  });

  it("rejects unsafe weights", () => {
    expect(() => calculatePoints("paper", 0)).toThrow();
    expect(() => calculatePoints("paper", 501)).toThrow();
  });

  it("keeps the demo staff account assigned to a real center", () => {
    expect(PARTNER_CENTERS.some((center) => center.id === STAFF_CENTER_ID)).toBe(true);
    expect(DEMO_MEMBER_CODE).toBe("ECO-MM-1048");
  });
});
