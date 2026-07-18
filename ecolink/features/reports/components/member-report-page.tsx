"use client";

import { Check, ChevronRight, Flame, LoaderCircle, LocateFixed, MapPin, ShieldAlert, Trash2, Waves } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import type { MemberReport } from "@/features/reports/types";

const ISSUES = [
  { id: "plastic-dump", title: "Plastic dump", description: "Accumulated bags, bottles or packaging", Icon: Trash2 },
  { id: "blocked-drain", title: "Blocked drain", description: "Waste obstructing water flow", Icon: Waves },
  { id: "water-pollution", title: "Water pollution", description: "Visible dumping or unusual water colour", Icon: Waves },
  { id: "illegal-burning", title: "Illegal burning", description: "Open burning of waste or plastic", Icon: Flame },
  { id: "chemical-spill", title: "Chemical spill", description: "Unknown liquid, fumes or hazardous material", Icon: ShieldAlert },
] as const;

const SEVERITIES = [
  { id: "limited", title: "Limited", description: "Small and contained; no immediate danger." },
  { id: "concerning", title: "Concerning", description: "Growing or affecting a shared public area." },
  { id: "urgent", title: "Urgent", description: "Spreading quickly or potentially dangerous." },
] as const;

const EMPTY_FORM = {
  title: "",
  issueType: "plastic-dump",
  severity: "concerning",
  locationText: "",
  details: "",
} satisfies ReportFormState;

const STATUS_LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

type ReportFormState = {
  title: string;
  issueType: (typeof ISSUES)[number]["id"];
  severity: (typeof SEVERITIES)[number]["id"];
  locationText: string;
  details: string;
};

type ReportsResponse = { reports: MemberReport[] } | { error: string };

export function MemberReportPage({
  initialReports,
  initialError,
}: {
  initialReports: MemberReport[];
  initialError?: string;
}) {
  const [form, setForm] = useState<ReportFormState>(EMPTY_FORM);
  const [reports, setReports] = useState<MemberReport[]>(initialReports);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string>();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | undefined>(
    initialError ? { kind: "error", text: initialError } : undefined,
  );

  const selectedIssue = useMemo(() => ISSUES.find((item) => item.id === form.issueType) ?? ISSUES[0], [form.issueType]);

  function updateForm(update: Partial<ReportFormState>) {
    setForm((current) => ({ ...current, ...update }));
  }

  async function loadReports() {
    setRefreshing(true);
    const response = await fetch("/api/reports", { cache: "no-store" });
    const body = (await response.json()) as ReportsResponse;
    setRefreshing(false);
    if (!response.ok || "error" in body) {
      setMessage({ kind: "error", text: "error" in body ? body.error : "Could not load reports." });
      return;
    }
    setReports(body.reports);
  }

  function useLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessage({ kind: "error", text: "Location services are not available in this browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateForm({ locationText: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}` });
        setMessage(undefined);
      },
      () => setMessage({ kind: "error", text: "We could not read your location. Enter a nearby landmark instead." }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(undefined);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { error?: string };
    setSubmitting(false);
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "The report could not be submitted." });
      return;
    }
    setForm(EMPTY_FORM);
    setMessage({ kind: "success", text: "Your report is awaiting admin approval." });
    await loadReports();
  }

  async function claimPoints(reportId: string) {
    setClaimingId(reportId);
    setMessage(undefined);
    const response = await fetch(`/api/reports/${reportId}/claim`, { method: "POST" });
    const body = (await response.json()) as { error?: string; claim?: { pointsAwarded: number } };
    setClaimingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Report points could not be claimed." });
      return;
    }
    setMessage({ kind: "success", text: `${body.claim?.pointsAwarded ?? 50} points were added to your account.` });
    await loadReports();
  }

  return (
    <AppShell>
      <main className="content-container report-page report-page--wide">
        <header className="report-intro"><p>Community action</p><h1>Report an environmental issue</h1><span>Reports are reviewed before points can be claimed, so community impact stays trustworthy.</span></header>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.text}</p> : null}
        <section className="report-workspace">
          <div className="report-step-heading"><span>Submit report</span><h2>What should EcoLink review?</h2><p>No points are awarded until an admin approves the report.</p></div>
          <form className="report-submit-form" onSubmit={submitReport}>
            <label><span>Report title</span><input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder={`${selectedIssue.title} near Hledan`} required /></label>
            <div className="issue-grid">{ISSUES.map(({ id, title: itemTitle, description, Icon }) => <button className={form.issueType === id ? "issue-option is-selected" : "issue-option"} type="button" onClick={() => updateForm({ issueType: id })} key={id}><Icon size={21}/><span><strong>{itemTitle}</strong><small>{description}</small></span>{form.issueType === id ? <Check size={18}/> : null}</button>)}</div>
            <fieldset className="severity-field"><legend>How serious is it?</legend>{SEVERITIES.map((item) => <label className={form.severity === item.id ? "severity-option is-selected" : "severity-option"} key={item.id}><input type="radio" name="severity" value={item.id} checked={form.severity === item.id} onChange={() => updateForm({ severity: item.id })}/><span><strong>{item.title}</strong><small>{item.description}</small></span></label>)}</fieldset>
            <label><span>Nearby landmark or coordinates</span><div className="input-with-icon"><MapPin size={18}/><input value={form.locationText} onChange={(event) => updateForm({ locationText: event.target.value })} placeholder="Example: Hledan Market, Insein Road" required /></div></label>
            <button className="button button--secondary" type="button" onClick={useLocation}><LocateFixed size={17}/> Use my current location</button>
            <label><span>Relevant details <small>(optional)</small></span><textarea value={form.details} maxLength={500} onChange={(event) => updateForm({ details: event.target.value })} placeholder="Describe what you can see and any immediate risks."/><small>{form.details.length}/500</small></label>
            <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={17}/> : <ChevronRight size={17}/>} {submitting ? "Submitting" : "Send report"}</button>
          </form>
        </section>
        <section className="history-section report-history" aria-labelledby="report-history-title">
          <div className="card-heading-row"><div><p>Your reports</p><h2 id="report-history-title">Report history</h2></div><button className="button button--secondary" type="button" onClick={loadReports} disabled={refreshing}>{refreshing ? "Refreshing" : "Refresh"}</button></div>
          {reports.length === 0 ? <p className="empty-copy">No reports yet.</p> : (
            <div className="report-history-list">
              {reports.map((report) => {
                const canClaim = report.status === "APPROVED" && !report.isClaimed;
                return (
                  <article key={report.id}>
                    <div>
                      <span className={`report-status report-status--${report.status.toLowerCase()}`}>{STATUS_LABELS[report.status]}</span>
                      <h3>{report.title}</h3>
                      <p>{report.locationText} &middot; {DATE_FORMATTER.format(new Date(report.createdAt))}</p>
                      {report.status === "PENDING" ? <small>Your report is awaiting admin approval.</small> : null}
                      {report.status === "REJECTED" ? <small>{report.rejectionReason ?? "This report was not approved for points."}</small> : null}
                      {report.isClaimed ? <small>Claimed {report.pointsAwarded ?? 50} points.</small> : null}
                    </div>
                    <button className="button button--primary" type="button" disabled={!canClaim || claimingId === report.id} onClick={() => claimPoints(report.id)}>
                      {claimingId === report.id ? "Claiming" : report.isClaimed ? "Claimed" : canClaim ? "Claim Points" : "Claim unavailable"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          <Link className="back-link" href="/dashboard">View dashboard</Link>
        </section>
      </main>
    </AppShell>
  );
}
