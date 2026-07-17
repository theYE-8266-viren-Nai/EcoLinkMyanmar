"use client";

import { ArrowLeft, CheckCircle2, ClipboardCheck, Gift, KeyRound, LogOut, PackageCheck, QrCode, Scale, Search, ShieldCheck, TicketCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EcoLinkMark } from "@/components/ecolink/app-shell";
import { DEMO_MEMBER_CODE, MATERIALS, PARTNER_CENTERS, PARTNER_REWARDS, STAFF_ACCESS_CODE, STAFF_CENTER_ID, calculatePoints, type MaterialSlug } from "@/lib/ecolink-data";
import { useEcoLink } from "@/providers/ecolink-provider";
import { fulfillPartnerReward, recordCenterDropOff } from "@/actions/center-operations";

const SESSION_KEY = "ecolink-demo-staff-session";
const DEMO_MODE = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE !== "false";

export default function AdminPage() {
  const { state, balance, addDropOff, fulfillReward } = useEcoLink();
  const [active, setActive] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [materialSlug, setMaterialSlug] = useState<MaterialSlug>("pet-plastic");
  const [weight, setWeight] = useState("1.0");
  const [claimCode, setClaimCode] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>();
  const center = PARTNER_CENTERS.find((item) => item.id === STAFF_CENTER_ID) ?? PARTNER_CENTERS[0];
  const centerDropOffs = state.dropOffs.filter((item) => item.centerId === STAFF_CENTER_ID);
  const centerWeight = centerDropOffs.reduce((total, item) => total + item.weightKg, 0);
  const pendingRewards = state.redemptions.filter((redemption) => redemption.status === "reserved" && PARTNER_REWARDS.find((reward) => reward.id === redemption.rewardId)?.centerId === STAFF_CENTER_ID);
  const previewPoints = useMemo(() => { try { return calculatePoints(materialSlug, Number(weight)); } catch { return 0; } }, [materialSlug, weight]);

  useEffect(() => {
    const timer = window.setTimeout(() => setActive(window.sessionStorage.getItem(SESSION_KEY) === "active"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accessCode.trim().toUpperCase() !== STAFF_ACCESS_CODE) { setMessage({ kind: "error", text: "That staff access code is not valid." }); return; }
    window.sessionStorage.setItem(SESSION_KEY, "active"); setActive(true); setMessage(undefined);
  }

  async function recordDropOff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { const result = DEMO_MODE ? { ok: true as const, ...addDropOff({ memberCode, materialSlug, weightKg: Number(weight) }) } : await recordCenterDropOff({ memberCode, materialSlug, weightKg: Number(weight) }); if (!result.ok) throw new Error(result.error); setMessage({ kind: "success", text: `${result.points} points added from ${center.name}.` }); setWeight("1.0"); }
    catch (caught) { setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The drop-off could not be recorded." }); }
  }

  async function collectReward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { if (DEMO_MODE) fulfillReward(claimCode); else { const result = await fulfillPartnerReward(claimCode); if (!result.ok) throw new Error(result.error); } setMessage({ kind: "success", text: "Reward marked as collected at this center." }); setClaimCode(""); }
    catch (caught) { setMessage({ kind: "error", text: caught instanceof Error ? caught.message : "The reward could not be collected." }); }
  }

  if (!active) return (
    <main className="admin-login-page"><section className="admin-login-brand"><Link href="/"><EcoLinkMark/></Link><div><p>Citizen website</p><h1>Partner center portal</h1><span>Center staff verify drop-offs and fulfill rewards in a separate, role-gated workspace.</span></div><Link className="back-link" href="/"><ArrowLeft size={17}/> Return to EcoLink</Link></section><section className="admin-login-panel"><div className="admin-login-card"><span className="admin-login-icon"><KeyRound size={25}/></span><p>Staff access</p><h2>Enter the center dashboard</h2><form onSubmit={signIn}><label><span>Staff access code</span><div className="input-with-icon"><ShieldCheck size={18}/><input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="off" placeholder="Enter staff code"/></div></label>{message?.kind === "error" ? <p className="form-error" role="alert">{message.text}</p> : null}<button className="button button--primary" type="submit">Open staff dashboard</button></form><div className="demo-credentials"><div><strong>Demo credentials</strong><span>Use these to explore the full workflow.</span></div><dl><div><dt>Staff access code</dt><dd>{STAFF_ACCESS_CODE}</dd></div><div><dt>Member code</dt><dd>{DEMO_MEMBER_CODE}</dd></div></dl><button type="button" onClick={() => setAccessCode(STAFF_ACCESS_CODE)}><ClipboardCheck size={16}/> Fill staff access code</button></div><p className="security-caveat"><ShieldCheck size={18}/><span><strong>Center-scoped access.</strong> Production staff authenticate with Supabase and permissions tied to their assigned center.</span></p></div></section></main>
  );

  return (
    <main className="admin-page">
      <header className="admin-header"><Link href="/"><EcoLinkMark compact/></Link><div><span className="status-dot"/><strong>{center.name}</strong><small>Active staff session</small></div><button className="button button--secondary" type="button" onClick={() => { window.sessionStorage.removeItem(SESSION_KEY); setActive(false); }}><LogOut size={17}/> Sign out</button></header>
      <div className="admin-container">
        <div className="admin-title"><div><p>Partner center portal</p><h1>{center.name}</h1><span>{center.township} &middot; {center.hours}</span></div><Link className="back-link" href="/"><ArrowLeft size={17}/> Citizen website</Link></div>
        <p className="admin-notice"><ShieldCheck size={18}/>This portal is center-scoped. Staff can only write records for centers assigned to their account.</p>
        <section className="admin-stats" aria-label="Center dashboard summary"><article><span><PackageCheck size={20}/></span><div><p>Recorded drop-offs</p><strong>{centerDropOffs.length}</strong></div></article><article><span><Scale size={20}/></span><div><p>Verified weight</p><strong>{centerWeight.toFixed(1)} kg</strong></div></article><article><span><Gift size={20}/></span><div><p>Rewards awaiting pickup</p><strong>{pendingRewards.length}</strong></div></article></section>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.kind === "success" ? <CheckCircle2 size={18}/> : <ShieldCheck size={18}/>} {message.text}</p> : null}
        <div className="admin-workspace">
          <section className="admin-form-section"><div className="card-heading-row"><div><p>POINT ADDITION</p><h2>Record a verified drop-off</h2></div><span className="step-badge"><ShieldCheck size={14}/> Center-scoped</span></div><form onSubmit={recordDropOff} className="admin-form"><div className="form-section-number"><span>1</span><div><strong>Find the member</strong><p>Enter the visible member code.</p></div></div><label><span>EcoLink member code</span><div className="input-with-action"><div className="input-with-icon"><Search size={17}/><input value={memberCode} onChange={(event) => setMemberCode(event.target.value)} placeholder={DEMO_MEMBER_CODE}/></div><button type="button" onClick={() => setMemberCode(DEMO_MEMBER_CODE)} aria-label="Fill member code"><QrCode size={18}/></button></div></label>{memberCode.trim().toUpperCase() === state.user.memberCode ? <div className="member-match"><span>MT</span><div><strong>{state.user.displayName}</strong><small>{state.user.memberCode} &middot; {balance} points</small></div><UserCheck size={20}/></div> : null}<div className="form-section-number"><span>2</span><div><strong>Verify the material</strong><p>Use the measured weight from this center.</p></div></div><div className="admin-form-grid"><label><span>Material</span><select value={materialSlug} onChange={(event) => setMaterialSlug(event.target.value as MaterialSlug)}>{MATERIALS.filter((material) => center.materials.includes(material.slug)).map((material) => <option value={material.slug} key={material.slug}>{material.name}</option>)}</select></label><label><span>Weight (kg)</span><input type="number" min="0.1" max="500" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)}/></label></div><div className="points-preview"><span>Points to add</span><strong>+{previewPoints}</strong><small>Calculated from the configured material rate</small></div><button className="button button--primary" type="submit" disabled={!memberCode || previewPoints <= 0}>Add verified points</button></form></section>
          <aside className="admin-side-column"><section className="admin-form-section"><div className="card-heading-row"><div><p>PARTNER FULFILLMENT</p><h2>Collect a reward claim</h2></div><TicketCheck size={20}/></div><form className="admin-form" onSubmit={collectReward}><label><span>Reward claim code</span><input value={claimCode} onChange={(event) => setClaimCode(event.target.value)} placeholder="ECO-XXXXXXXX"/></label><p>Only rewards assigned to {center.name} can be fulfilled here.</p><button className="button button--primary" type="submit" disabled={!claimCode}>Mark reward collected</button></form></section><section className="admin-activity"><div className="card-heading-row"><div><p>TODAY</p><h2>Recent activity</h2></div></div>{centerDropOffs.length === 0 ? <p>No drop-offs recorded yet.</p> : centerDropOffs.slice(0, 5).map((dropOff) => <article key={dropOff.id}><span><PackageCheck size={17}/></span><div><strong>{MATERIALS.find((material) => material.slug === dropOff.materialSlug)?.name}</strong><small>{dropOff.weightKg.toFixed(1)} kg &middot; +{dropOff.points} points</small></div></article>)}</section></aside>
        </div>
      </div>
    </main>
  );
}
