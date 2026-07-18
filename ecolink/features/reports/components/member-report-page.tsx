"use client";

import { Camera, ChevronRight, LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import type { MemberReport } from "@/features/reports/types";

const EMPTY_FORM = {
  image: undefined,
  latitude: undefined,
  longitude: undefined,
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
  image?: File;
  latitude?: number;
  longitude?: number;
};

type ReportsResponse = { reports: MemberReport[] } | { error: string };

async function readJsonResponse<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

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
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | undefined>(
    initialError ? { kind: "error", text: initialError } : undefined,
  );

  const hasLocation = typeof form.latitude === "number" && typeof form.longitude === "number";

  function updateForm(update: Partial<ReportFormState>) {
    setForm((current) => ({ ...current, ...update }));
  }

  async function loadReports() {
    setRefreshing(true);
    const response = await fetch("/api/reports", { cache: "no-store" });
    const body = await readJsonResponse<ReportsResponse>(response);
    setRefreshing(false);
    if (!response.ok || !body || "error" in body) {
      setMessage({ kind: "error", text: body && "error" in body ? body.error : "Could not load reports." });
      return;
    }
    setReports(body.reports);
  }

  function useLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessage({ kind: "error", text: "Location services are not available in this browser." });
      return;
    }
    setMessage(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateForm({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setMessage(undefined);
      },
      () => setMessage({ kind: "error", text: "We could not read your current location. Please allow location access and try again." }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!form.image) {
      setMessage({ kind: "error", text: "Add a report image before submitting." });
      return;
    }
    if (!hasLocation) {
      setMessage({ kind: "error", text: "Use your current location before submitting." });
      return;
    }

    setSubmitting(true);
    setMessage(undefined);
    const formData = new FormData();
    formData.set("image", form.image);
    formData.set("latitude", String(form.latitude));
    formData.set("longitude", String(form.longitude));

    const response = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });
    const body = await readJsonResponse<{ error?: string }>(response);
    setSubmitting(false);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "The report could not be submitted." });
      return;
    }
    setForm(EMPTY_FORM);
    formElement.reset();
    setMessage({ kind: "success", text: "Your report is awaiting admin approval." });
    await loadReports();
  }

  return (
    <AppShell>
      <main className="content-container report-page report-page--wide">
        <header className="report-intro"><p>Community action</p><h1>Report an environmental issue</h1><span>Reports are reviewed by admins before any points are awarded.</span></header>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.text}</p> : null}
        <section className="report-workspace">
          <div className="report-step-heading"><span>Submit report</span><h2>Add photo evidence and current location</h2><p>No points are awarded until an admin approves the report.</p></div>
          <form className="report-submit-form" onSubmit={submitReport}>
            <label className="photo-upload">
              <span><Camera size={18}/> Report image</span>
              <input accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => updateForm({ image: event.target.files?.[0] })} required type="file" />
              <small>{form.image ? `${form.image.name} (${Math.max(1, Math.round(form.image.size / 1024))} KB)` : "JPEG, PNG, or WebP."}</small>
            </label>
            <button className={hasLocation ? "location-capture is-ready" : "location-capture"} type="button" onClick={useLocation}>
              <LocateFixed size={19}/>
              <span><strong>{hasLocation ? "Current location captured" : "Use my current location"}</strong><small>{hasLocation ? `${form.latitude?.toFixed(6)}, ${form.longitude?.toFixed(6)}` : "EcoLink will attach your browser GPS coordinates."}</small></span>
            </button>
            <button className="button button--primary" type="submit" disabled={submitting || !form.image || !hasLocation}>{submitting ? <LoaderCircle className="spin" size={17}/> : <ChevronRight size={17}/>} {submitting ? "Submitting" : "Send report"}</button>
          </form>
        </section>
        <section className="history-section report-history" aria-labelledby="report-history-title">
          <div className="card-heading-row"><div><p>Your reports</p><h2 id="report-history-title">Report history</h2></div><button className="button button--secondary" type="button" onClick={loadReports} disabled={refreshing}>{refreshing ? "Refreshing" : "Refresh"}</button></div>
          {reports.length === 0 ? <p className="empty-copy">No reports yet.</p> : (
            <div className="report-history-list">
              {reports.map((report) => {
                return (
                  <article key={report.id}>
                    <div>
                      <span className={`report-status report-status--${report.status.toLowerCase()}`}>{STATUS_LABELS[report.status]}</span>
                      <h3>{report.title}</h3>
                      {report.photoUrl ? <Image alt="Submitted report evidence" className="report-photo-thumb" height={203} src={report.photoUrl} unoptimized width={360} /> : null}
                      <p><MapPin size={14}/> {report.locationText} &middot; {DATE_FORMATTER.format(new Date(report.createdAt))}</p>
                      {report.photoStoragePath ? <small>Image attached: {report.photoStoragePath.split("/").at(-1)}</small> : null}
                      {report.status === "PENDING" ? <small>Your report is awaiting admin approval.</small> : null}
                      {report.status === "REJECTED" ? <small>{report.rejectionReason ?? "This report was not approved for points."}</small> : null}
                      {report.status === "APPROVED" ? <small>{report.pointsAwarded ?? 0} points awarded by admin approval.</small> : null}
                    </div>
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
