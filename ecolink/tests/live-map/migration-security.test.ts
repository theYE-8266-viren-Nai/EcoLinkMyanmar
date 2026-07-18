import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/20260718173000_yangon_live_waste_map.sql", import.meta.url)),
  "utf8",
).toLowerCase();
const postgisOperatorRepairMigration = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/20260718071259_repair_public_waste_map_postgis_operator.sql", import.meta.url)),
  "utf8",
).toLowerCase();
const reportStatusRepairMigration = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/20260718071726_repair_public_waste_map_report_status.sql", import.meta.url)),
  "utf8",
).toLowerCase();

describe("live map migration security", () => {
  it("enables RLS and restricts vehicle writes to assigned staff", () => {
    expect(migration).toContain("alter table public.collector_vehicle_locations enable row level security");
    expect(migration).toContain("assigned staff can insert vehicle locations");
    expect(migration).toContain("assigned staff can read vehicle locations");
    expect(migration).toContain("profile.auth_user_id = (select public.request_user_id())");
  });

  it("removes broad report reads and limits the public function grant", () => {
    expect(migration).toContain("revoke select on public.environment_reports from anon, authenticated");
    expect(migration).toContain("revoke all on function public.get_public_waste_map");
    expect(migration).not.toContain("'notes', report.notes");
    expect(migration).not.toContain("'reporterprofileid'");
  });

  it("adds spatial indexes and realtime replication", () => {
    expect(migration).toContain("using gist (location)");
    expect(migration).toContain("alter publication supabase_realtime add table public.collector_vehicle_locations");
  });

  it("qualifies postgis operators used with an empty search path", () => {
    expect(postgisOperatorRepairMigration).toContain("set search_path = ''");
    expect(postgisOperatorRepairMigration).toContain("operator(extensions.&&)");
  });

  it("filters public map reports with the current report status enum", () => {
    expect(reportStatusRepairMigration).toContain("'rejected'::public.report_status");
    expect(reportStatusRepairMigration).not.toContain("'resolved'");
  });
});
