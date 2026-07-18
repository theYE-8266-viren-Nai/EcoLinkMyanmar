"use client";

import { LoaderCircle, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { EcoLinkMark } from "@/components/ecolink/app-shell";
import { RECYCLING_ROUTE_STATUSES, type AdminCenterDropoffRouteRequest, type AdminPickupRouteRequest, type AdminRouteRequestList } from "@/features/recycling-routes/types";

type Message = { kind: "success" | "error"; text: string };
type RouteResponse = { requests: AdminRouteRequestList } | { error: string };

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

async function readJsonResponse<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function selectedItemLine(request: AdminPickupRouteRequest | AdminCenterDropoffRouteRequest) {
  if (request.selectedItems.length === 0) return "No item summary";
  return request.selectedItems
    .map((item) => `${item.itemType} (${item.estimatedWeightKg.toFixed(2)} kg, ~${item.estimatedPoints} pts)`)
    .join(", ");
}

function statusClass(status: AdminPickupRouteRequest["status"]) {
  return `report-status report-status--${status.toLowerCase()}`;
}

export function AdminRecyclingPage({
  initialError,
  initialRequests,
}: {
  initialError?: string;
  initialRequests: AdminRouteRequestList;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [savingId, setSavingId] = useState<string>();
  const [message, setMessage] = useState<Message | undefined>(
    initialError ? { kind: "error", text: initialError } : undefined,
  );

  async function loadRequests() {
    setSavingId("refresh");
    const response = await fetch("/api/admin/recycling", { cache: "no-store" });
    const body = await readJsonResponse<RouteResponse>(response);
    setSavingId(undefined);
    if (!response.ok || !body || "error" in body) {
      setMessage({ kind: "error", text: body && "error" in body ? body.error : "Could not load recycling requests." });
      return;
    }
    setRequests(body.requests);
  }

  function updatePickup(requestId: string, patch: Partial<AdminPickupRouteRequest>) {
    setRequests((current) => ({
      ...current,
      pickups: current.pickups.map((request) => request.requestId === requestId ? { ...request, ...patch } : request),
    }));
  }

  function updateCenter(requestId: string, patch: Partial<AdminCenterDropoffRouteRequest>) {
    setRequests((current) => ({
      ...current,
      centerDropoffs: current.centerDropoffs.map((request) => request.requestId === requestId ? { ...request, ...patch } : request),
    }));
  }

  async function savePickup(request: AdminPickupRouteRequest) {
    setSavingId(request.requestId);
    setMessage(undefined);
    const response = await fetch(`/api/admin/recycling/pickup/${request.requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: request.status,
        pickupAddress: request.pickupAddress,
        routeWindow: request.routeWindow,
        routeArea: request.routeArea,
        notes: request.notes,
      }),
    });
    const body = await readJsonResponse<{ error?: string }>(response);
    setSavingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "Pickup request could not be saved." });
      return;
    }
    setMessage({ kind: "success", text: "Pickup request saved." });
  }

  async function saveCenter(request: AdminCenterDropoffRouteRequest) {
    setSavingId(request.requestId);
    setMessage(undefined);
    const response = await fetch(`/api/admin/recycling/center/${request.requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: request.status,
        centerName: request.centerName,
        centerAddress: request.centerAddress,
        centerTownship: request.centerTownship,
        centerHours: request.centerHours,
        notes: request.notes,
      }),
    });
    const body = await readJsonResponse<{ error?: string }>(response);
    setSavingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "Center request could not be saved." });
      return;
    }
    setMessage({ kind: "success", text: "Center request saved." });
  }

  async function deleteRequest(kind: "pickup" | "center", requestId: string) {
    if (!window.confirm("Soft-delete this request? The member will remain unable to submit another route.")) return;
    setSavingId(requestId);
    setMessage(undefined);
    const response = await fetch(`/api/admin/recycling/${kind}/${requestId}`, { method: "DELETE" });
    const body = await readJsonResponse<{ error?: string }>(response);
    setSavingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "Request could not be deleted." });
      return;
    }
    if (kind === "pickup") {
      setRequests((current) => ({ ...current, pickups: current.pickups.filter((request) => request.requestId !== requestId) }));
    } else {
      setRequests((current) => ({ ...current, centerDropoffs: current.centerDropoffs.filter((request) => request.requestId !== requestId) }));
    }
    setMessage({ kind: "success", text: "Request deleted. The member route lock was kept." });
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/"><EcoLinkMark compact /></Link>
        <div><span className="status-dot"/><strong>Recycling submissions</strong><small>Pickup and center requests</small></div>
        <button className="button button--secondary" type="button" onClick={loadRequests} disabled={savingId === "refresh"}><RefreshCw size={17}/> {savingId === "refresh" ? "Refreshing" : "Refresh"}</button>
      </header>
      <div className="admin-container admin-reports-container">
        <div className="admin-title">
          <div><p>Admin MVP</p><h1>Recycle route CRUD</h1><span>Review, edit, status-update, and soft-delete member route submissions.</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="back-link" href="/admin/reports"><ShieldCheck size={17}/> Report moderation</Link>
            <Link className="back-link" href="/"><ShieldCheck size={17}/> Citizen website</Link>
          </div>
        </div>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.text}</p> : null}
        <RouteSection title="Truck pickup requests" empty="No pickup requests yet.">
          {requests.pickups.map((request) => (
            <article key={request.requestId}>
              <div className="admin-report-detail">
                <span className={statusClass(request.status)}>{request.status}</span>
                <h2>{request.pickupAddress}</h2>
                <dl>
                  <div><dt>Submitted by</dt><dd>{request.submittedBy.displayName} ({request.submittedBy.email})</dd></div>
                  <div><dt>Date</dt><dd>{DATE_FORMATTER.format(new Date(request.createdAt))}</dd></div>
                  <div><dt>Route</dt><dd>{request.routeWindow} - {request.routeArea}</dd></div>
                  <div><dt>Estimate</dt><dd>{request.estimatedWeightKg.toFixed(2)} kg - ~{request.estimatedPoints} pts</dd></div>
                  <div><dt>Items</dt><dd>{selectedItemLine(request)}</dd></div>
                </dl>
              </div>
              <div className="admin-review-actions">
                <label><span>Status</span><select value={request.status} onChange={(event) => updatePickup(request.requestId, { status: event.target.value as AdminPickupRouteRequest["status"] })}>{RECYCLING_ROUTE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label><span>Pickup address</span><textarea value={request.pickupAddress} onChange={(event) => updatePickup(request.requestId, { pickupAddress: event.target.value })} maxLength={500}/></label>
                <label><span>Route window</span><input value={request.routeWindow} onChange={(event) => updatePickup(request.requestId, { routeWindow: event.target.value })} maxLength={120}/></label>
                <label><span>Route area</span><input value={request.routeArea} onChange={(event) => updatePickup(request.requestId, { routeArea: event.target.value })} maxLength={120}/></label>
                <label><span>Notes</span><textarea value={request.notes ?? ""} onChange={(event) => updatePickup(request.requestId, { notes: event.target.value || null })} maxLength={500}/></label>
                <button className="button button--primary" type="button" disabled={savingId === request.requestId} onClick={() => savePickup(request)}>{savingId === request.requestId ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} Save</button>
                <button className="button button--secondary" type="button" disabled={savingId === request.requestId} onClick={() => deleteRequest("pickup", request.requestId)}><Trash2 size={17}/> Delete</button>
              </div>
            </article>
          ))}
        </RouteSection>
        <RouteSection title="Recycle center drop-offs" empty="No center drop-off requests yet.">
          {requests.centerDropoffs.map((request) => (
            <article key={request.requestId}>
              <div className="admin-report-detail">
                <span className={statusClass(request.status)}>{request.status}</span>
                <h2>{request.centerName}</h2>
                <dl>
                  <div><dt>Submitted by</dt><dd>{request.submittedBy.displayName} ({request.submittedBy.email})</dd></div>
                  <div><dt>Date</dt><dd>{DATE_FORMATTER.format(new Date(request.createdAt))}</dd></div>
                  <div><dt>Center</dt><dd>{request.centerAddress} - {request.centerTownship} - {request.centerHours}</dd></div>
                  <div><dt>Estimate</dt><dd>{request.estimatedWeightKg.toFixed(2)} kg - ~{request.estimatedPoints} pts</dd></div>
                  <div><dt>Items</dt><dd>{selectedItemLine(request)}</dd></div>
                </dl>
              </div>
              <div className="admin-review-actions">
                <label><span>Status</span><select value={request.status} onChange={(event) => updateCenter(request.requestId, { status: event.target.value as AdminCenterDropoffRouteRequest["status"] })}>{RECYCLING_ROUTE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label><span>Center name</span><input value={request.centerName} onChange={(event) => updateCenter(request.requestId, { centerName: event.target.value })} maxLength={180}/></label>
                <label><span>Center address</span><textarea value={request.centerAddress} onChange={(event) => updateCenter(request.requestId, { centerAddress: event.target.value })} maxLength={500}/></label>
                <label><span>Township</span><input value={request.centerTownship} onChange={(event) => updateCenter(request.requestId, { centerTownship: event.target.value })} maxLength={120}/></label>
                <label><span>Hours</span><input value={request.centerHours} onChange={(event) => updateCenter(request.requestId, { centerHours: event.target.value })} maxLength={120}/></label>
                <label><span>Notes</span><textarea value={request.notes ?? ""} onChange={(event) => updateCenter(request.requestId, { notes: event.target.value || null })} maxLength={500}/></label>
                <button className="button button--primary" type="button" disabled={savingId === request.requestId} onClick={() => saveCenter(request)}>{savingId === request.requestId ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} Save</button>
                <button className="button button--secondary" type="button" disabled={savingId === request.requestId} onClick={() => deleteRequest("center", request.requestId)}><Trash2 size={17}/> Delete</button>
              </div>
            </article>
          ))}
        </RouteSection>
      </div>
    </main>
  );
}

function RouteSection({ children, empty, title }: { children: ReactNode; empty: string; title: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="admin-report-list" aria-label={title}>
      <div className="admin-title" style={{ marginTop: 24 }}>
        <div><p>Recycling</p><h1>{title}</h1></div>
      </div>
      {hasChildren ? children : <p className="empty-copy">{empty}</p>}
    </section>
  );
}
