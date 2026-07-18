"use client";

import { CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { EcoLinkMark } from "@/components/ecolink/app-shell";
import type { AdminPendingReport } from "@/features/reports/types";

type PendingReportsResponse = { reports: AdminPendingReport[] } | { error: string };

async function readJsonResponse<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

export function AdminReportsPage({
  initialReports,
  initialError,
}: {
  initialReports: AdminPendingReport[];
  initialError?: string;
}) {
  const [reports, setReports] = useState<AdminPendingReport[]>(initialReports);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string>();
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | undefined>(
    initialError ? { kind: "error", text: initialError } : undefined,
  );

  async function loadReports() {
    setRefreshing(true);
    const response = await fetch("/api/admin/reports", { cache: "no-store" });
    const body = await readJsonResponse<PendingReportsResponse>(response);
    setRefreshing(false);
    if (!response.ok || !body || "error" in body) {
      setMessage({ kind: "error", text: body && "error" in body ? body.error : "Could not load pending reports." });
      return;
    }
    setReports(body.reports);
  }

  async function reviewReport(reportId: string, action: "approve" | "reject") {
    setActingId(reportId);
    setMessage(undefined);
    const response = await fetch(`/api/admin/reports/${reportId}/${action}`, {
      method: "POST",
      headers: action === "reject" ? { "content-type": "application/json" } : undefined,
      body: action === "reject" ? JSON.stringify({ reason: rejectionReasons[reportId] }) : undefined,
    });
    const body = await readJsonResponse<{ error?: string }>(response);
    setActingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "The report could not be reviewed." });
      return;
    }
    setMessage({ kind: "success", text: action === "approve" ? "Report approved." : "Report rejected." });
    await loadReports();
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/"><EcoLinkMark compact /></Link>
        <div><span className="status-dot"/><strong>Report moderation</strong><small>Pending reports only</small></div>
        <button className="button button--secondary" type="button" onClick={loadReports} disabled={refreshing}><RefreshCw size={17}/> {refreshing ? "Refreshing" : "Refresh"}</button>
      </header>
      <div className="admin-container admin-reports-container">
        <div className="admin-title"><div><p>Admin MVP</p><h1>Pending reports</h1><span>Approve community reports to award points directly.</span></div><Link className="back-link" href="/"><ShieldCheck size={17}/> Citizen website</Link></div>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.text}</p> : null}
        <section className="admin-report-list" aria-label="Pending report moderation queue">
          {reports.length === 0 ? <p className="empty-copy">No pending reports.</p> : reports.map((report) => (
            <article key={report.id}>
              <div className="admin-report-detail">
                <span className="report-status report-status--pending">Pending</span>
                <h2>{report.title}</h2>
                {report.photoUrl ? <Image alt="Submitted report evidence" className="admin-report-photo" height={293} src={report.photoUrl} unoptimized width={520} /> : null}
                <dl>
                  <div><dt>Submitted by</dt><dd>{report.submittedBy.displayName} ({report.submittedBy.email})</dd></div>
                  <div><dt>Date</dt><dd>{DATE_FORMATTER.format(new Date(report.createdAt))}</dd></div>
                  <div><dt>Issue</dt><dd>{report.issueType}</dd></div>
                  <div><dt>Severity</dt><dd>{report.severity}</dd></div>
                  <div><dt>Location</dt><dd>{report.locationText}</dd></div>
                  <div><dt>Image</dt><dd>{report.photoStoragePath ? report.photoStoragePath.split("/").pop() : "No image attached"}</dd></div>
                  <div><dt>Details</dt><dd>{report.details ?? "No additional details"}</dd></div>
                  <div><dt>Status</dt><dd>{report.status}</dd></div>
                </dl>
              </div>
              <div className="admin-review-actions">
                <label><span>Rejection reason <small>(optional)</small></span><textarea value={rejectionReasons[report.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={300}/></label>
                <button className="button button--primary" type="button" disabled={actingId === report.id} onClick={() => reviewReport(report.id, "approve")}>{actingId === report.id ? <LoaderCircle className="spin" size={17}/> : <CheckCircle2 size={17}/>} Approve</button>
                <button className="button button--secondary" type="button" disabled={actingId === report.id} onClick={() => reviewReport(report.id, "reject")}><XCircle size={17}/> Reject</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
