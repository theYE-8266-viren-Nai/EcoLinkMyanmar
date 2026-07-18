import { ArrowRight, Award, CalendarDays, CheckCircle2, Gift, Leaf, Recycle, Scale } from "lucide-react";
import Link from "next/link";

import type { ImpactDashboardData } from "@/features/impact/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

const MATERIAL_COLORS = ["#087c78", "#62aa6d", "#eda83a", "#0b3558"];

export function ImpactDashboard({ data }: { data: ImpactDashboardData }) {
  return (
    <main className="content-container dashboard-impact-page">
      <header className="page-intro">
        <div>
          <p>Citizen dashboard</p>
          <h1>{data.displayName}&apos;s verified impact</h1>
          <span>Recycling activity is counted only after a partner center verifies material and weight.</span>
        </div>
        <span className="network-badge"><CheckCircle2 size={17} /> {data.memberCode}</span>
      </header>

      <section className="dashboard-impact-grid" aria-label="Your verified recycling contribution">
        <article className="points-card points-card--large">
          <div className="points-card__top"><span><Award size={24} /></span><p>Impact points</p></div>
          <strong>{data.balance}</strong>
          <div className="milestone-row"><span>{data.pointsToNextMilestone} points to the next milestone</span><b>{data.nextMilestone}</b></div>
          <div className="progress-track" role="progressbar" aria-label="Points milestone progress" aria-valuemin={data.milestoneStart} aria-valuemax={data.nextMilestone} aria-valuenow={data.balance}>
            <span style={{ width: `${data.milestoneProgress}%` }} />
          </div>
          <Link className="points-card__redeem" href="/rewards"><span><Gift size={22} /></span><div><strong>Use points</strong><small>Partner rewards and community goals</small></div><ArrowRight size={22} /></Link>
        </article>

        <article className="material-impact material-impact--wide" aria-labelledby="material-impact-title">
          <div className="material-impact__header">
            <div><p>YOUR MATERIAL MIX</p><h2 id="material-impact-title">Material impact</h2></div>
            <div><strong>{data.verifiedWeightKg.toFixed(1)} kg</strong><span>Verified recycling</span></div>
          </div>
          <div className="material-stack" aria-hidden="true">
            {data.materialMix.map((material, index) => (
              <span key={material.slug} style={{ flexGrow: material.weightKg, background: MATERIAL_COLORS[index % MATERIAL_COLORS.length] }} />
            ))}
          </div>
          <div className="material-legend">
            {data.materialMix.map((material, index) => (
              <div key={material.slug}><span style={{ background: MATERIAL_COLORS[index % MATERIAL_COLORS.length] }} /><strong>{material.name}</strong><b>{material.weightKg.toFixed(1)} kg</b></div>
            ))}
          </div>
          <p className="impact-note"><Leaf size={20} /> EcoLink reports verified kilograms without claiming unproven environmental equivalents.</p>
        </article>
      </section>

      <section className="history-section history-section--wide" aria-labelledby="ledger-title">
        <div className="card-heading-row">
          <div><p>YOUR LEDGER</p><h2 id="ledger-title">Points activity</h2></div>
          <span className="status-chip"><CheckCircle2 size={15} /> Balance verified</span>
        </div>
        <div className="history-list history-list--roomy">
          {data.ledger.length === 0 ? (
            <p className="empty-copy">No verified recycling activity yet.</p>
          ) : data.ledger.slice(0, 6).map((item) => (
            <article key={item.id}>
              <span className="history-material"><Recycle size={22} /></span>
              <div className="history-main">
                <strong>{item.materialName}</strong>
                <p>{item.centerName} &middot; {item.weightKg.toFixed(1)} kg</p>
                <time dateTime={item.recordedAt}><CalendarDays size={15} />{DATE_FORMATTER.format(new Date(item.recordedAt))}</time>
              </div>
              <b className="history-points">+{item.points} pts</b>
            </article>
          ))}
        </div>
        <Link className="ledger-view-all" href="/rewards">View all <ArrowRight size={20} /></Link>
      </section>

      {data.isDemoFallback ? <p className="demo-note">Demo data is showing. Set `NEXT_PUBLIC_ECOLINK_DEMO_MODE=false`, run the Supabase seed, and sign in to test live database rows.</p> : null}

      <section className="dashboard-stat-row" aria-label="Impact summary">
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--green"><Scale size={21} /></span><div><p>Verified recycling</p><strong>{data.verifiedWeightKg.toFixed(1)} kg</strong><span>Across {data.ledger.length} verified activities</span></div></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--aqua"><Recycle size={21} /></span><div><p>Top material</p><strong>{data.topMaterialName}</strong><span>Ranked by verified kilograms</span></div></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--amber"><Award size={21} /></span><div><p>Points earned</p><strong>{data.balance}</strong><span>Ledger-backed balance</span></div></article>
      </section>
    </main>
  );
}
