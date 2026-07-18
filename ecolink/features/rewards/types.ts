export type RewardOfferView = {
  id: string;
  databaseId: string;
  partner: string;
  township: string;
  title: string;
  description: string;
  points: number;
  stock: number;
  imageUrl: string;
};

export type RewardRedemptionView = {
  id: string;
  rewardOfferId: string;
  claimCode: string;
  status: "reserved" | "fulfilled" | "cancelled" | "refunded";
};

export type RewardsPageData = {
  balance: number;
  offers: RewardOfferView[];
  redemptions: RewardRedemptionView[];
  errorMessage?: string;
};
