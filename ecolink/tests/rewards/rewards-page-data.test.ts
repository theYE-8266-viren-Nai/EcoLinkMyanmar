import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient }));

import { getRewardsPageData } from "@/features/rewards/data/rewards-page-data";

describe("rewards page data", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  it("loads the balance, offer cost, stock, and reservations from Supabase", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "ensure_current_profile") {
        return { data: [{ profile_id: "profile-1", member_code: "ECO-1", display_name: "Mya" }], error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    const from = vi.fn((table: string) => {
      if (table === "point_ledger_entries") {
        return {
          select: () => ({
            eq: () => ({
              range: async () => ({
                data: [{ points: 500 }, { points: 50 }, { points: -20 }],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "partner_reward_offers") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [{
                  id: "20000000-0000-0000-0000-000000000001",
                  title: "Reusable market tote",
                  description: "A sturdy washable bag.",
                  township: "Hlaing Township",
                  points_cost: 150,
                  stock: 7,
                }],
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [{
                    id: "redemption-1",
                    reward_offer_id: "20000000-0000-0000-0000-000000000001",
                    claim_code: "ECO-ABCD1234",
                    status: "reserved",
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    });
    createSupabaseServerClient.mockResolvedValue({ rpc, from });

    const data = await getRewardsPageData({
      email: "mya@example.com",
      user_metadata: { full_name: "Mya" },
    } as unknown as User);

    expect(data.balance).toBe(530);
    expect(data.offers[0]).toMatchObject({ points: 150, stock: 7 });
    expect(data.redemptions[0]).toMatchObject({
      rewardOfferId: "20000000-0000-0000-0000-000000000001",
      claimCode: "ECO-ABCD1234",
    });
    expect(rpc).not.toHaveBeenCalledWith("get_current_points_balance");
  });
});
