import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ReportRepository } from "@/features/reports/data/report-repository";
import type { Database } from "@/lib/database.types";

describe("ReportRepository", () => {
  it("calls ensure_current_profile with the Supabase client receiver intact", async () => {
    const supabase = {
      receiverToken: "supabase-client",
      rpc(this: { receiverToken?: string }, name: string, args: unknown) {
        if (this.receiverToken !== "supabase-client") {
          throw new TypeError("Supabase rpc was called without its client receiver.");
        }

        expect(name).toBe("ensure_current_profile");
        expect(args).toEqual({
          profile_display_name: "Ada",
          profile_email: "ada@example.com",
        });

        return Promise.resolve({
          data: [{ profile_id: "profile-1", member_code: "ECO-001", display_name: "Ada" }],
          error: null,
        });
      },
    } as unknown as SupabaseClient<Database>;

    const repository = new ReportRepository(supabase);
    const profile = await repository.ensureCurrentProfile({
      email: "ada@example.com",
      user_metadata: { full_name: "Ada" },
    } as unknown as User);

    expect(profile).toEqual({
      profile_id: "profile-1",
      member_code: "ECO-001",
      display_name: "Ada",
    });
  });
});
