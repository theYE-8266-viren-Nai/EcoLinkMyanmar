"use client";

import { ArrowRight, Award, CalendarDays, CircleGauge, Gift, Leaf, MapPinned, Recycle, Scale, Sparkles } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/ecolink/app-shell";
import { PARTNER_CENTERS, materialName } from "@/lib/ecolink-data";
import { useEcoLink } from "@/providers/ecolink-context";

const DROP_OFF_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

export default function HomePage() {
  const { state, balance, verifiedWeightKg } = useEcoLink();
  const materialTotals = state.dropOffs.reduce<Record<string, number>>((totals, item) => {
    totals[item.materialSlug] = (totals[item.materialSlug] ?? 0) + item.weightKg;
    return totals;
  }, {});
  const topMaterials = Object.entries(materialTotals).sort((a, b) => b[1] - a[1]);
  const nextMilestone = Math.ceil((balance + 1) / 500) * 500;
  const milestoneStart = Math.max(0, nextMilestone - 500);
  const milestoneProgress = ((balance - milestoneStart) / 500) * 100;

  return (
    <AppShell>
      <main className="content-container home-page">
        <section className="home-hero">
          <div className="home-hero__content">
            <span className="hero-kicker"><Leaf size={16} /> Small actions, shared impact</span>
            <h1>Good morning, Mya.</h1>
            <p>Your recycling is adding up. Keep useful materials moving through Yangon&apos;s circular economy.</p>
            <div className="hero-actions"><Link className="button button--light" href="/recycle"><MapPinned size={18} /> Find a center</Link><Link className="button button--glass" href="/rewards"><Gift size={18} /> Use points</Link></div>
          </div>
          <div className="hero-visual" aria-hidden="true"><span className="hero-visual__sun"/><span className="hero-visual__city"/><span className="hero-visual__river"/><span className="hero-visual__badge"><Recycle size={28}/></span></div>
        </section>

        <section className="impact-overview" aria-label="Your EcoLink impact">
          <article className="points-card">
            <div className="points-card__top"><span><Award size={20} /></span><p>Impact points</p><CircleGauge size={18} /></div>
            <strong>{balance}</strong>
            <div className="milestone-row"><span>{nextMilestone - balance} points to the next milestone</span><b>{nextMilestone}</b></div>
            <div className="progress-track" role="progressbar" aria-label="Points milestone progress" aria-valuemin={milestoneStart} aria-valuemax={nextMilestone} aria-valuenow={balance}><span style={{ width: `${Math.max(0, Math.min(100, milestoneProgress))}%` }} /></div>
            <Link className="points-card__redeem" href="/rewards"><span><Gift size={18} /></span><div><strong>Use points</strong><small>Partner rewards and community goals</small></div><ArrowRight size={18} /></Link>
          </article>
          <article className="stat-card"><span className="stat-card__icon stat-card__icon--green"><Scale size={21}/></span><div><p>Verified recycling</p><strong>{verifiedWeightKg.toFixed(1)} kg</strong><span>Across {state.dropOffs.length} drop-offs</span></div></article>
          <article className="stat-card"><span className="stat-card__icon stat-card__icon--aqua"><Recycle size={21}/></span><div><p>Top material</p><strong>{topMaterials[0] ? materialName(topMaterials[0][0] as never) : "None yet"}</strong><span>{topMaterials[0]?.[1].toFixed(1) ?? "0.0"} kg recovered</span></div></article>
          <article className="stat-card"><span className="stat-card__icon stat-card__icon--amber"><CircleGauge size={21}/></span><div><p>Current streak</p><strong>3 weeks</strong><span>One verified drop-off weekly</span></div></article>
        </section>

        <section className="quick-actions" aria-labelledby="quick-actions-title">
          <div className="section-heading"><p>Get started</p><h2 id="quick-actions-title">What would you like to do?</h2></div>
          <div className="quick-action-grid">
            <Link className="quick-action quick-action--teal" href="/recycle#analyzer"><span><Sparkles size={22}/></span><div><strong>Check an item</strong><p>Use EcoGuide only when you are unsure.</p></div><ArrowRight size={20}/></Link>
            <Link className="quick-action quick-action--navy" href="/recycle"><span><MapPinned size={22}/></span><div><strong>Find a center</strong><p>Browse partner centers on the live map.</p></div><ArrowRight size={20}/></Link>
            <Link className="quick-action quick-action--green" href="/report"><span><Recycle size={22}/></span><div><strong>Report an issue</strong><p>Help your community act on environmental problems.</p></div><ArrowRight size={20}/></Link>
          </div>
        </section>

        <div className="home-columns">
          <section className="history-section" aria-labelledby="history-title">
            <div className="card-heading-row"><div><p>YOUR LEDGER</p><h2 id="history-title">Points activity</h2></div><span className="status-chip">Balance verified</span></div>
            <div className="history-list">{state.dropOffs.map((item) => { const center = PARTNER_CENTERS.find((entry) => entry.id === item.centerId); return <article key={item.id}><span className="history-material"><Recycle size={19}/></span><div className="history-main"><strong>{materialName(item.materialSlug)}</strong><p>{center?.name ?? "Partner center"} &middot; {item.weightKg.toFixed(1)} kg</p><time><CalendarDays size={13}/>{DROP_OFF_DATE_FORMATTER.format(new Date(item.recordedAt))}</time></div><b className="history-points">+{item.points} pts</b></article>; })}</div>
          </section>
          <aside className="material-impact" aria-labelledby="material-impact-title">
            <div className="card-heading-row"><div><p>YOUR MIX</p><h2 id="material-impact-title">Material impact</h2></div><Recycle size={22}/></div>
            <div className="material-bars">{topMaterials.map(([slug, weight], index) => <div key={slug}><span><strong>{materialName(slug as never)}</strong><b>{weight.toFixed(1)} kg</b></span><div><i style={{ width: `${Math.max(12, (weight / (topMaterials[0]?.[1] ?? 1)) * 100)}%`, background: ["#087c78", "#2f7a4c", "#0b3558", "#d99a2b"][index % 4] }}/></div></div>)}</div>
            <p className="impact-note"><Leaf size={17}/>EcoLink shows verified kilograms rather than unproven environmental equivalents.</p>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
