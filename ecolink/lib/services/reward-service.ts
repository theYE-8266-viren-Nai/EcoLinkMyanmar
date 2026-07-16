import { repositoryFailure, repositorySuccess, transaction, type RepositoryResponse } from "@/lib/db";
import { RewardRepository } from "@/lib/repositories/reward-repository";
import type { RewardRedemption } from "@/lib/generated/prisma/client";

export class RewardService {
  async redeemReward(
    userProfileId: string,
    rewardOfferId: string,
  ): Promise<RepositoryResponse<RewardRedemption>> {
    return transaction(async (tx) => {
      const repository = new RewardRepository(tx);
      const balance = await repository.getBalance(userProfileId);
      const offer = await tx.rewardOffer.findFirst({
        where: { id: rewardOfferId, status: "ACTIVE", deletedAt: null },
      });

      if (!offer) {
        return repositoryFailure("NOT_FOUND", "This reward is not available.");
      }

      if (offer.quantityAvailable !== null && offer.quantityAvailable <= 0) {
        return repositoryFailure("VALIDATION", "This reward is out of stock.");
      }

      if (balance < offer.pointsCost) {
        return repositoryFailure("VALIDATION", "The user does not have enough points.");
      }

      const redemption = await repository.redeemOffer(userProfileId, rewardOfferId);

      return repositorySuccess(redemption);
    });
  }
}
