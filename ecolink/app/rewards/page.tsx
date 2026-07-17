"use client";

import { ArrowLeft, Check, Gift, HandHeart, MapPin, TicketCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import { PARTNER_REWARDS } from "@/lib/ecolink-data";
import { useEcoLink } from "@/providers/ecolink-context";
import { redeemPartnerReward } from "@/actions/rewards";

const DEMO_MODE = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE !== "false";

function RewardClaimDialog({ claimCode, onClose }: { claimCode: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog aria-labelledby="reward-claim-title" className="claim-dialog" onCancel={onClose} ref={dialogRef}>
      <section className="claim-modal"><button type="button" className="modal-close" onClick={onClose} aria-label="Close reward claim"><X size={19}/></button><span><TicketCheck size={30}/></span><p>Reward reserved</p><h2 id="reward-claim-title">Show this code at the partner center</h2><strong>{claimCode}</strong><small>Your points were deducted when the reservation was created.</small><button className="button button--primary" type="button" onClick={onClose}>Done</button></section>
    </dialog>
  );
}

export default function RewardsPage() {
  const { state, balance, redeemReward, contributeToCleanup } = useEcoLink();
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState("");
  const [contribution, setContribution] = useState(100);

  async function redeem(rewardId: string) {
    try { const reward = PARTNER_REWARDS.find((item) => item.id === rewardId); if (!reward) throw new Error("This reward is no longer available."); const result = DEMO_MODE ? { ok: true as const, ...redeemReward(rewardId) } : await redeemPartnerReward(reward.databaseId); if (!result.ok) throw new Error(result.error); setClaimCode(result.claimCode); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The reward could not be reserved."); }
  }

  function contribute() {
    try { contributeToCleanup(contribution); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The contribution could not be completed."); }
  }

  return (
    <AppShell>
      <main className="content-container rewards-page">
        <Link className="back-link" href="/"><ArrowLeft size={17}/> Back home</Link>
        <header className="rewards-intro"><div><p>Make your points useful</p><h1>Choose what your recycling unlocks.</h1><span>Reserve a practical partner reward, or help a funded community cleanup reach its goal.</span></div><div className="balance-panel"><span>Available balance</span><strong>{balance}</strong><small>points</small></div></header>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <section className="offers-section" aria-labelledby="offers-title"><div className="section-heading"><p>Local partner offers</p><h2 id="offers-title">Redeem your points</h2><span>Points are deducted when you reserve.</span></div><div className="reward-grid">{PARTNER_REWARDS.map((reward) => { const reserved = state.redemptions.find((item) => item.rewardId === reward.id); return <article className="reward-card" key={reward.id}><div className="reward-card__top"><span><Gift size={22}/></span><small>{reward.stock} left</small></div><p>{reward.partner}</p><h3>{reward.title}</h3><span>{reward.description}</span><small className="reward-location"><MapPin size={14}/>{reward.township}</small><div><strong>{reward.points} points</strong><button className="button button--primary" type="button" disabled={balance < reward.points || Boolean(reserved)} onClick={() => redeem(reward.id)}>{reserved ? <><Check size={16}/> Reserved</> : `Redeem ${reward.points}`}</button></div>{reserved ? <p className="claim-preview"><TicketCheck size={16}/>{reserved.claimCode}</p> : null}</article>; })}</div></section>
        <section className="cleanup-section"><div className="cleanup-copy"><span><HandHeart size={22}/></span><p>Shared action</p><h2>Help unlock a Hlaing riverbank cleanup</h2><span>Community points unlock a sponsor commitment; the points themselves are not money.</span><div className="cleanup-progress"><div><span>7,400 of 10,000 points</span><strong>74%</strong></div><i><b style={{ width: "74%" }}/></i></div></div><aside><p>Circular City Sponsor Fund commits</p><strong>Gloves, collection bags, volunteer transport and licensed waste hauling.</strong><span>Your contribution: {state.cleanupContribution} / 300 points</span><div className="contribution-control"><select value={contribution} onChange={(event) => setContribution(Number(event.target.value))} aria-label="Contribution amount"><option value={50}>50 points</option><option value={100}>100 points</option><option value={200}>200 points</option><option value={300}>300 points</option></select><button className="button button--primary" type="button" onClick={contribute}>Contribute points</button></div></aside></section>
        <p className="demo-note">Partner names, stock and offers shown here are illustrative. A live rollout should publish only signed, funded agreements.</p>
        {claimCode ? <RewardClaimDialog claimCode={claimCode} onClose={() => setClaimCode("")} /> : null}
      </main>
    </AppShell>
  );
}
