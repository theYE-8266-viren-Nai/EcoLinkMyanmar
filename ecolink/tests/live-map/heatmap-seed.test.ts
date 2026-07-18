import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const seed = readFileSync(
  fileURLToPath(new URL("../../supabase/seeds/yangon_heatmap_reports.sql", import.meta.url)),
  "utf8",
);

describe("Yangon heatmap seed", () => {
  it("contains 52 idempotent synthetic observations within the public map window", () => {
    expect(seed.match(/81000000-0000-0000-0000-\d{12}/g)).toHaveLength(52);
    expect(seed).toContain("on conflict (id) do update set");
    expect(seed).toContain("'APPROVED'::public.report_status");
    expect(seed).toContain("now() - age");
    expect(seed.match(/Synthetic red heatmap hotspot observation/g)).toHaveLength(20);
  });
});
