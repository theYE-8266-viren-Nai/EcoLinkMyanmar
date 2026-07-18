import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient }));

import { redeemPartnerReward } from "@/actions/rewards";

describe("reward actions", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  it("returns the authoritative remaining ledger balance after redemption", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        redemption_id: "30000000-0000-4000-8000-000000000001",
        claim_code: "ECO-ABCD1234",
        balance: 350,
      }],
      error: null,
    }));
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })) },
      rpc,
    });

    await expect(redeemPartnerReward("20000000-0000-0000-0000-000000000001")).resolves.toEqual({
      ok: true,
      redemptionId: "30000000-0000-4000-8000-000000000001",
      claimCode: "ECO-ABCD1234",
      balance: 350,
    });
    expect(rpc).toHaveBeenCalledWith("redeem_partner_reward", {
      reward_id: "20000000-0000-0000-0000-000000000001",
    });
  });

  it("reads the updated ledger when the deployed redemption RPC has the old response shape", async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        redemption_id: "30000000-0000-4000-8000-000000000001",
        claim_code: "ECO-ABCD1234",
      }],
      error: null,
    }));
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "profile-1" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            range: async () => ({ data: [{ points: 500 }, { points: -150 }], error: null }),
          }),
        }),
      };
    });
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })) },
      rpc,
      from,
    });

    await expect(redeemPartnerReward("20000000-0000-4000-8000-000000000001")).resolves.toMatchObject({
      ok: true,
      balance: 350,
    });
    expect(from).toHaveBeenCalledWith("point_ledger_entries");
  });

  it("requires an authenticated member", async () => {
    createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });

    await expect(redeemPartnerReward("20000000-0000-4000-8000-000000000001")).resolves.toEqual({
      ok: false,
      error: "Sign in to reserve a reward.",
    });
  });
});
