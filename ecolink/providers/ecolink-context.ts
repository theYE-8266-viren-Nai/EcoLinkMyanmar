"use client";

import { createContext, useContext } from "react";

import type { EcoLinkState, EnvironmentReport, MaterialSlug } from "@/lib/ecolink-data";

export type AddDropOffInput = { memberCode: string; materialSlug: MaterialSlug; weightKg: number };

export type EcoLinkContextValue = {
  state: EcoLinkState;
  balance: number;
  verifiedWeightKg: number;
  addDropOff: (input: AddDropOffInput) => { points: number };
  redeemReward: (rewardId: string) => { claimCode: string };
  fulfillReward: (claimCode: string) => void;
  contributeToCleanup: (points: number) => void;
  addReport: (report: Omit<EnvironmentReport, "id" | "createdAt">) => void;
  markAllNotificationsRead: () => void;
  resetDemo: () => void;
};

export const EcoLinkContext = createContext<EcoLinkContextValue | null>(null);

export function useEcoLink() {
  const context = useContext(EcoLinkContext);
  if (!context) throw new Error("useEcoLink must be used inside EcoLinkProvider.");
  return context;
}
