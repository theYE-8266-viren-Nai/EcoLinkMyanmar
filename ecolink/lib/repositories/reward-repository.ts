import { activeRecord, paginate, prisma, type DbClient, type PaginationInput } from "@/lib/db";
import type { Prisma, RewardOfferStatus } from "@/lib/generated/prisma/client";

export interface RewardOfferFilters extends PaginationInput {
  status?: RewardOfferStatus;
  maxPointsCost?: number;
}

export class RewardRepository {
  constructor(private readonly db: DbClient = prisma) {}

  listOffers(filters: RewardOfferFilters = {}) {
    const { skip, take } = paginate(filters);

    return this.db.rewardOffer.findMany({
      where: {
        ...activeRecord,
        status: filters.status ?? "ACTIVE",
        pointsCost: filters.maxPointsCost ? { lte: filters.maxPointsCost } : undefined,
      },
      include: { organization: true },
      orderBy: [{ pointsCost: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    });
  }

  createOffer(data: Prisma.RewardOfferCreateInput) {
    return this.db.rewardOffer.create({ data });
  }

  async getBalance(userProfileId: string) {
    const result = await this.db.rewardLedgerEntry.aggregate({
      where: { userProfileId },
      _sum: { points: true },
    });

    return result._sum.points ?? 0;
  }

  listLedger(userProfileId: string, input: PaginationInput = {}) {
    const { skip, take } = paginate(input);

    return this.db.rewardLedgerEntry.findMany({
      where: { userProfileId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  createLedgerEntry(data: Prisma.RewardLedgerEntryUncheckedCreateInput) {
    return this.db.rewardLedgerEntry.create({ data });
  }

  async redeemOffer(userProfileId: string, rewardOfferId: string) {
    const offer = await this.db.rewardOffer.findFirstOrThrow({
      where: { id: rewardOfferId, status: "ACTIVE", ...activeRecord },
    });

    const redemption = await this.db.rewardRedemption.create({
      data: {
        userProfileId,
        rewardOfferId,
        pointsSpent: offer.pointsCost,
      },
    });

    await this.db.rewardLedgerEntry.create({
      data: {
        userProfileId,
        entryType: "SPENT",
        points: -offer.pointsCost,
        sourceType: "REWARD_REDEMPTION",
        sourceId: redemption.id,
        rewardRedemptionId: redemption.id,
        description: `Redeemed reward: ${offer.title}`,
      },
    });

    if (offer.quantityAvailable !== null) {
      await this.db.rewardOffer.update({
        where: { id: offer.id },
        data: { quantityAvailable: { decrement: 1 } },
      });
    }

    return redemption;
  }
}
