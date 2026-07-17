"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  INITIAL_STATE,
  PARTNER_REWARDS,
  STAFF_CENTER_ID,
  calculatePoints,
  materialName,
  type EcoLinkState,
  type EnvironmentReport,
  type MaterialSlug,
} from "@/lib/ecolink-data";

const STORAGE_KEY = "ecolink-product-demo-v1";

type AddDropOffInput = { memberCode: string; materialSlug: MaterialSlug; weightKg: number };

type EcoLinkContextValue = {
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

const EcoLinkContext = createContext<EcoLinkContextValue | null>(null);

function getBalance(state: EcoLinkState) {
  const earned = state.dropOffs.reduce((total, item) => total + item.points, 0);
  const spent = state.redemptions.reduce((total, item) => {
    const reward = PARTNER_REWARDS.find((offer) => offer.id === item.rewardId);
    return total + (reward?.points ?? 0);
  }, 0);
  return state.openingBalance + earned - spent - state.cleanupContribution;
}

export function EcoLinkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EcoLinkState>(INITIAL_STATE);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        setState(JSON.parse(saved) as EcoLinkState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addDropOff = useCallback((input: AddDropOffInput) => {
    if (input.memberCode.trim().toUpperCase() !== INITIAL_STATE.user.memberCode) {
      throw new Error("Member code not found. Try ECO-MM-1048 for the demo account.");
    }
    const points = calculatePoints(input.materialSlug, input.weightKg);
    setState((current) => ({
      ...current,
      dropOffs: [{ id: crypto.randomUUID(), centerId: STAFF_CENTER_ID, materialSlug: input.materialSlug, weightKg: input.weightKg, points, recordedAt: new Date().toISOString() }, ...current.dropOffs],
      notifications: [{ id: crypto.randomUUID(), title: "Points added", message: `${points} points were added for ${input.weightKg.toFixed(1)} kg of ${materialName(input.materialSlug)}.`, href: "/", read: false, createdAt: new Date().toISOString() }, ...current.notifications],
    }));
    return { points };
  }, []);

  const redeemReward = useCallback((rewardId: string) => {
    const reward = PARTNER_REWARDS.find((item) => item.id === rewardId);
    if (!reward) throw new Error("This reward is no longer available.");
    let claimCode = "";
    setState((current) => {
      if (getBalance(current) < reward.points) throw new Error("You do not have enough points for this reward.");
      claimCode = `ECO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      return {
        ...current,
        redemptions: [{ id: crypto.randomUUID(), rewardId, claimCode, status: "reserved", createdAt: new Date().toISOString() }, ...current.redemptions],
        notifications: [{ id: crypto.randomUUID(), title: "Reward reserved", message: `${reward.title} is ready to collect. Show your claim code at the partner center.`, href: "/rewards", read: false, createdAt: new Date().toISOString() }, ...current.notifications],
      };
    });
    return { claimCode };
  }, []);

  const fulfillReward = useCallback((claimCode: string) => {
    setState((current) => {
      const redemption = current.redemptions.find((item) => item.claimCode.toUpperCase() === claimCode.trim().toUpperCase());
      if (!redemption) throw new Error("Claim code not found.");
      const reward = PARTNER_REWARDS.find((item) => item.id === redemption.rewardId);
      if (reward?.centerId && reward.centerId !== STAFF_CENTER_ID) throw new Error("This reward belongs to a different partner center.");
      if (redemption.status === "fulfilled") throw new Error("This reward has already been collected.");
      return {
        ...current,
        redemptions: current.redemptions.map((item) => item.id === redemption.id ? { ...item, status: "fulfilled" as const } : item),
        notifications: [{ id: crypto.randomUUID(), title: "Reward collected", message: `${reward?.title ?? "Your reward"} was collected successfully.`, href: "/rewards", read: false, createdAt: new Date().toISOString() }, ...current.notifications],
      };
    });
  }, []);

  const contributeToCleanup = useCallback((points: number) => {
    setState((current) => {
      if (points <= 0 || points > 300 || getBalance(current) < points) throw new Error("Choose a contribution within your available balance.");
      return { ...current, cleanupContribution: current.cleanupContribution + points };
    });
  }, []);

  const addReport = useCallback((report: Omit<EnvironmentReport, "id" | "createdAt">) => {
    setState((current) => ({
      ...current,
      reports: [{ ...report, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current.reports],
      notifications: [{ id: crypto.randomUUID(), title: "Report received", message: "Your environmental report is now in the community review queue.", href: "/report", read: false, createdAt: new Date().toISOString() }, ...current.notifications],
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }));
  }, []);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
  }, []);

  const value = useMemo(() => ({
    state,
    balance: getBalance(state),
    verifiedWeightKg: state.dropOffs.reduce((total, item) => total + item.weightKg, 0),
    addDropOff,
    redeemReward,
    fulfillReward,
    contributeToCleanup,
    addReport,
    markAllNotificationsRead,
    resetDemo,
  }), [state, addDropOff, redeemReward, fulfillReward, contributeToCleanup, addReport, markAllNotificationsRead, resetDemo]);

  return <EcoLinkContext.Provider value={value}>{children}</EcoLinkContext.Provider>;
}

export function useEcoLink() {
  const context = useContext(EcoLinkContext);
  if (!context) throw new Error("useEcoLink must be used inside EcoLinkProvider.");
  return context;
}
