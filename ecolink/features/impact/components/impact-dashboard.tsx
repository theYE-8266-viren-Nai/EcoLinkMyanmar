import { ArrowRight, Award, CalendarDays, CheckCircle2, Clock3, Gift, MapPin, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";

import type { ImpactDashboardData, ReportStatus } from "@/features/impact/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_ICONS = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
} satisfies Record<ReportStatus, typeof CheckCircle2>;

function formatPoints(points: number) {
  return `${points > 0 ? "+" : ""}${points} pts`;
}

export function ImpactDashboard({ data }: { data: ImpactDashboardData }) {
  return (
    <main className="content-container dashboard-impact-page">
      <header className="page-intro">
        <div>
          <p>Citizen dashboard</p>
          <h1>{data.displayName}&apos;s verified impact</h1>
          <span>Points come from your point ledger after an admin approves your reports.</span>
        </div>
        <span className="network-badge"><CheckCircle2 size={17} /> {data.memberCode}</span>
      </header>

      {data.errorMessage ? (
        <p className="admin-message is-error" role="status">{data.errorMessage}</p>
      ) : null}

      <section className="dashboard-impact-grid" aria-label="Your verified report contribution">
        <article className="points-card points-card--large">
          <div className="points-card__top"><span><Award size={24} /></span><p>Impact points</p></div>
          <strong>{data.balance}</strong>
          <div className="milestone-row"><span>{data.pointsToNextMilestone} points to the next milestone</span><b>{data.nextMilestone}</b></div>
          <div className="progress-track" role="progressbar" aria-label="Points milestone progress" aria-valuemin={data.milestoneStart} aria-valuemax={data.nextMilestone} aria-valuenow={data.balance}>
            <span style={{ width: `${data.milestoneProgress}%` }} />
          </div>
          <Link className="points-card__redeem" href="/rewards"><span><Gift size={22} /></span><div><strong>Use points</strong><small>Reward redemptions subtract from this balance</small></div><ArrowRight size={22} /></Link>
        </article>

        <article className="material-impact material-impact--wide" aria-labelledby="report-summary-title">
          <div className="material-impact__header">
            <div><p>YOUR REPORTS</p><h2 id="report-summary-title">Review status</h2></div>
            <div><strong>{data.totalReportCount}</strong><span>Total reports</span></div>
          </div>
          <div className="material-legend">
            <div><span className="report-status-dot report-status-dot--approved" /><strong>Approved</strong><b>{data.approvedReportCount}</b></div>
            <div><span className="report-status-dot report-status-dot--pending" /><strong>Pending</strong><b>{data.pendingReportCount}</b></div>
            <div><span className="report-status-dot report-status-dot--rejected" /><strong>Rejected</strong><b>{data.rejectedReportCount}</b></div>
          </div>
          <p className="impact-note"><ShieldCheck size={20} /> Pending and rejected reports do not change your point balance.</p>
        </article>
      </section>

      <section className="history-section history-section--wide" aria-labelledby="ledger-title">
        <div className="card-heading-row">
          <div><p>YOUR LEDGER</p><h2 id="ledger-title">Points activity</h2></div>
          <span className="status-chip"><CheckCircle2 size={15} /> Supabase ledger</span>
        </div>
        <div className="history-list history-list--roomy">
          {data.ledger.length === 0 ? (
            <p className="empty-copy">No point ledger entries yet.</p>
          ) : data.ledger.slice(0, 6).map((item) => (
            <article key={item.id}>
              <span className="history-material"><Award size={22} /></span>
              <div className="history-main">
                <strong>{item.title}</strong>
                <p>{item.description}{item.locationText ? ` · ${item.locationText}` : ""}</p>
                <time dateTime={item.recordedAt}><CalendarDays size={15} />{DATE_FORMATTER.format(new Date(item.recordedAt))}</time>
              </div>
              <b className={item.points < 0 ? "history-points history-points--negative" : "history-points"}>{formatPoints(item.points)}</b>
            </article>
          ))}
        </div>
        <Link className="ledger-view-all" href="/rewards">View rewards <ArrowRight size={20} /></Link>
      </section>

      <section className="history-section history-section--wide" aria-labelledby="report-history-title">
        <div className="card-heading-row">
          <div><p>YOUR REPORTS</p><h2 id="report-history-title">Report history</h2></div>
          <Link className="back-link" href="/report">Submit report</Link>
        </div>
        <div className="history-list history-list--roomy">
          {data.reports.length === 0 ? (
            <p className="empty-copy">No reports yet.</p>
          ) : data.reports.slice(0, 6).map((report) => {
            const StatusIcon = STATUS_ICONS[report.status];
            return (
              <article key={report.id}>
                <span className="history-material"><StatusIcon size={22} /></span>
                <div className="history-main">
                  <strong>{report.title}</strong>
                  <p><MapPin size={14} /> {report.locationText}</p>
                  <time dateTime={report.createdAt}><CalendarDays size={15} />{DATE_FORMATTER.format(new Date(report.createdAt))}</time>
                  {report.status === "REJECTED" ? <small>{report.rejectionReason ?? "This report was not approved for points."}</small> : null}
                </div>
                <b className={`report-status report-status--${report.status.toLowerCase()}`}>{STATUS_LABELS[report.status]}</b>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-stat-row" aria-label="Impact summary">
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--green"><CheckCircle2 size={21} /></span><div><p>Approved reports</p><strong>{data.approvedReportCount}</strong><span>Admin-reviewed reports</span></div></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--aqua"><Clock3 size={21} /></span><div><p>Pending reports</p><strong>{data.pendingReportCount}</strong><span>No points until approval</span></div></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--amber"><Award size={21} /></span><div><p>Points earned</p><strong>{data.positivePoints}</strong><span>Positive ledger entries</span></div></article>
      </section>
    </main>
  );
}
