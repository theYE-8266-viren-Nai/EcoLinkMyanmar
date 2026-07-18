import { describe, expect, it, vi } from "vitest";

import { getPointLedgerBalance } from "@/features/rewards/data/point-ledger-balance";

describe("point ledger balance", () => {
  it("sums every ledger page instead of only the visible dashboard activity", async () => {
    const firstPage = Array.from({ length: 1_000 }, () => ({ points: 1 }));
    const range = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [{ points: 50 }, { points: -150 }], error: null });
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({ range }),
        }),
      })),
    };

    const result = await getPointLedgerBalance(supabase as never, "profile-1");

    expect(result).toEqual({ data: 900, error: null });
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1_000, 1_999);
  });
});
