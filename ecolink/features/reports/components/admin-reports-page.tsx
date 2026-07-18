"use client";

import { CheckCircle2, ImageIcon, LoaderCircle, MapPin, Search, UserRound, XCircle } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { AdminMetric, AdminShell } from "@/features/admin/components/admin-shell";
import type { AdminPendingReport } from "@/features/reports/types";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const [reports, setReports] = useState<AdminPendingReport[]>(initialReports);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string>();
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | undefined>(
    initialError ? { kind: "error", text: initialError } : undefined,
  );

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return reports;
    return reports.filter((report) =>
      [report.title, report.issueType, report.locationText, report.submittedBy.displayName, report.submittedBy.email]
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, reports]);

  const highPriorityCount = reports.filter((report) => /high|critical|severe/i.test(report.severity)).length;
  const evidenceCount = reports.filter((report) => Boolean(report.photoUrl)).length;

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
    <AdminShell
      activeSection="reports"
      description={t("admin.approveHelp")}
      isRefreshing={refreshing}
      onRefresh={loadReports}
      title={t("admin.pendingReports")}
    >
      <div className="admin-metrics" aria-label="Moderation summary">
        <AdminMetric label="Pending" value={reports.length} detail="Awaiting a decision" />
        <AdminMetric label="High priority" value={highPriorityCount} detail="High or critical severity" />
        <AdminMetric label="With evidence" value={evidenceCount} detail="Photo attached" />
      </div>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.text}</p> : null}
        <section className="admin-data-section" aria-label={t("admin.queue")}>
          <div className="admin-data-toolbar">
            <div>
              <h2>Moderation queue</h2>
              <span>{filteredReports.length} of {reports.length} reports</span>
            </div>
            <label className="admin-search">
              <span className="sr-only">Search pending reports</span>
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, location, or member…" type="search" />
            </label>
          </div>

          {reports.length === 0 ? (
            <div className="admin-empty"><CheckCircle2 size={22} aria-hidden="true" /><h3>Queue cleared</h3><p>{t("admin.empty")}</p></div>
          ) : filteredReports.length === 0 ? (
            <div className="admin-empty"><Search size={22} aria-hidden="true" /><h3>No matching reports</h3><p>Try a different title, member, issue type, or location.</p></div>
          ) : (
            <div className="admin-record-list">
              {filteredReports.map((report) => (
                <details className="admin-record" key={report.id}>
                  <summary>
                    <span className="admin-record-primary">
                      <span className="report-status report-status--pending">{t("admin.pending")}</span>
                      <strong>{report.title}</strong>
                      <small><MapPin size={13} aria-hidden="true" />{report.locationText}</small>
                    </span>
                    <span className="admin-record-meta">
                      <span><UserRound size={14} aria-hidden="true" />{report.submittedBy.displayName}</span>
                      <span>{report.issueType} · {report.severity}</span>
                      <time dateTime={report.createdAt}>{DATE_FORMATTER.format(new Date(report.createdAt))}</time>
                    </span>
                  </summary>
                  <div className="admin-record-body">
                    <div className="admin-report-detail">
                      {report.photoUrl ? <Image alt="Submitted report evidence" className="admin-report-photo" height={293} src={report.photoUrl} unoptimized width={520} /> : <div className="admin-photo-placeholder"><ImageIcon size={22} aria-hidden="true" /><span>{t("admin.noImage")}</span></div>}
                      <dl>
                        <div><dt>{t("admin.submittedBy")}</dt><dd>{report.submittedBy.displayName}<br/><span>{report.submittedBy.email}</span></dd></div>
                        <div><dt>{t("admin.date")}</dt><dd>{DATE_FORMATTER.format(new Date(report.createdAt))}</dd></div>
                        <div><dt>{t("admin.issue")}</dt><dd>{report.issueType}</dd></div>
                        <div><dt>{t("admin.severity")}</dt><dd>{report.severity}</dd></div>
                        <div><dt>{t("admin.location")}</dt><dd>{report.locationText}</dd></div>
                        <div><dt>{t("admin.image")}</dt><dd>{report.photoStoragePath ? report.photoStoragePath.split("/").pop() : t("admin.noImage")}</dd></div>
                        <div className="admin-detail-wide"><dt>{t("admin.details")}</dt><dd>{report.details ?? t("admin.noDetails")}</dd></div>
                      </dl>
                    </div>
                    <div className="admin-review-actions">
                      <div className="admin-action-heading"><strong>Review decision</strong><span>Approve verified reports or record a reason before rejecting.</span></div>
                      <label><span>{t("admin.rejectReason")} <small>{t("admin.optional")}</small></span><textarea value={rejectionReasons[report.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [report.id]: event.target.value }))} maxLength={300} placeholder="Add context for the member…"/></label>
                      <div className="admin-action-row">
                        <button className="button button--primary" type="button" disabled={actingId === report.id} onClick={() => reviewReport(report.id, "approve")}>{actingId === report.id ? <LoaderCircle className="spin" size={17}/> : <CheckCircle2 size={17}/>} {t("admin.approve")}</button>
                        <button className="button button--danger" type="button" disabled={actingId === report.id} onClick={() => reviewReport(report.id, "reject")}><XCircle size={17}/> {t("admin.reject")}</button>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
    </AdminShell>
  );
}
