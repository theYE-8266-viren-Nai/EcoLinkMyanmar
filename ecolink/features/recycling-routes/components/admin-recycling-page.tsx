"use client";

import { LoaderCircle, MapPin, Save, Search, Trash2, Truck, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { AdminMetric, AdminShell } from "@/features/admin/components/admin-shell";
import { RECYCLING_ROUTE_STATUSES, type AdminCenterDropoffRouteRequest, type AdminPickupRouteRequest, type AdminRouteRequestList, type RecyclingRouteStatus } from "@/features/recycling-routes/types";

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
  const [query, setQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState<"all" | "pickup" | "center">("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | RecyclingRouteStatus>("ALL");
  const [message, setMessage] = useState<Message | undefined>(
    initialError ? { kind: "error", text: initialError } : undefined,
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRequests = useMemo(() => {
    function matches(request: AdminPickupRouteRequest | AdminCenterDropoffRouteRequest) {
      const locationValues = request.kind === "pickup"
        ? [request.pickupAddress, request.routeArea, request.routeWindow]
        : [request.centerName, request.centerAddress, request.centerTownship, request.centerHours];
      const matchesQuery = !normalizedQuery || [
        request.submittedBy.displayName,
        request.submittedBy.email,
        ...locationValues,
        ...request.selectedItems.map((item) => item.itemType),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (statusFilter === "ALL" || request.status === statusFilter);
    }

    return {
      pickups: routeFilter === "center" ? [] : requests.pickups.filter(matches),
      centerDropoffs: routeFilter === "pickup" ? [] : requests.centerDropoffs.filter(matches),
    };
  }, [normalizedQuery, requests, routeFilter, statusFilter]);

  const allRequests = [...requests.pickups, ...requests.centerDropoffs];
  const pendingCount = allRequests.filter((request) => request.status === "PENDING").length;
  const completedCount = allRequests.filter((request) => request.status === "COMPLETED").length;
  const visibleCount = filteredRequests.pickups.length + filteredRequests.centerDropoffs.length;

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
    <AdminShell
      activeSection="recycling"
      description="Review member routes, update operational details, and manage request status from one queue."
      isRefreshing={savingId === "refresh"}
      onRefresh={loadRequests}
      title="Recycling submissions"
    >
      <div className="admin-metrics" aria-label="Recycling request summary">
        <AdminMetric label="All requests" value={allRequests.length} detail={`${requests.pickups.length} pickups · ${requests.centerDropoffs.length} drop-offs`} />
        <AdminMetric label="Needs review" value={pendingCount} detail="Currently pending" />
        <AdminMetric label="Completed" value={completedCount} detail="Finished routes" />
      </div>
        {message ? <p className={message.kind === "success" ? "admin-message is-success" : "admin-message is-error"} role="status">{message.text}</p> : null}
      <section className="admin-data-section" aria-label="Recycling request records">
        <div className="admin-data-toolbar admin-data-toolbar--filters">
          <div>
            <h2>Request directory</h2>
            <span>{visibleCount} of {allRequests.length} requests</span>
          </div>
          <div className="admin-filter-controls">
            <div className="admin-segmented" aria-label="Filter by route type">
              {(["all", "pickup", "center"] as const).map((filter) => (
                <button aria-pressed={routeFilter === filter} key={filter} onClick={() => setRouteFilter(filter)} type="button">
                  {filter === "all" ? "All" : filter === "pickup" ? "Pickups" : "Drop-offs"}
                </button>
              ))}
            </div>
            <label className="admin-compact-select">
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | RecyclingRouteStatus)}>
                <option value="ALL">All statuses</option>
                {RECYCLING_ROUTE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="admin-search">
              <span className="sr-only">Search recycling requests</span>
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member, route, or item…" type="search" />
            </label>
          </div>
        </div>

        {visibleCount === 0 ? (
          <div className="admin-empty"><Search size={22} aria-hidden="true" /><h3>No matching requests</h3><p>Adjust the route type, status, or search terms to see more records.</p></div>
        ) : null}

        {filteredRequests.pickups.length > 0 ? (
          <RouteSection count={filteredRequests.pickups.length} icon={<Truck size={17} aria-hidden="true" />} title="Truck pickups">
            {filteredRequests.pickups.map((request) => (
              <details className="admin-record" key={request.requestId}>
                <summary>
                  <span className="admin-record-primary">
                    <span className={statusClass(request.status)}>{request.status}</span>
                    <strong>{request.pickupAddress}</strong>
                    <small><MapPin size={13} aria-hidden="true" />{request.routeArea}</small>
                  </span>
                  <span className="admin-record-meta">
                    <span>{request.submittedBy.displayName}</span>
                    <span>{request.estimatedWeightKg.toFixed(2)} kg · ~{request.estimatedPoints} pts</span>
                    <time dateTime={request.createdAt}>{DATE_FORMATTER.format(new Date(request.createdAt))}</time>
                  </span>
                </summary>
                <div className="admin-record-body">
                  <RouteDetails request={request} routeLabel={`${request.routeWindow} · ${request.routeArea}`} />
                  <div className="admin-review-actions">
                    <div className="admin-action-heading"><strong>Edit pickup</strong><span>Update the fulfillment status and route information.</span></div>
                    <div className="admin-form-grid">
                      <label><span>Status</span><select value={request.status} onChange={(event) => updatePickup(request.requestId, { status: event.target.value as AdminPickupRouteRequest["status"] })}>{RECYCLING_ROUTE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                      <label><span>Route window</span><input value={request.routeWindow} onChange={(event) => updatePickup(request.requestId, { routeWindow: event.target.value })} maxLength={120}/></label>
                      <label className="admin-form-wide"><span>Pickup address</span><textarea value={request.pickupAddress} onChange={(event) => updatePickup(request.requestId, { pickupAddress: event.target.value })} maxLength={500}/></label>
                      <label><span>Route area</span><input value={request.routeArea} onChange={(event) => updatePickup(request.requestId, { routeArea: event.target.value })} maxLength={120}/></label>
                      <label className="admin-form-wide"><span>Internal notes <small>Optional</small></span><textarea value={request.notes ?? ""} onChange={(event) => updatePickup(request.requestId, { notes: event.target.value || null })} maxLength={500}/></label>
                    </div>
                    <RecordActions disabled={savingId === request.requestId} onDelete={() => deleteRequest("pickup", request.requestId)} onSave={() => savePickup(request)} />
                  </div>
                </div>
              </details>
            ))}
          </RouteSection>
        ) : null}

        {filteredRequests.centerDropoffs.length > 0 ? (
          <RouteSection count={filteredRequests.centerDropoffs.length} icon={<Warehouse size={17} aria-hidden="true" />} title="Center drop-offs">
            {filteredRequests.centerDropoffs.map((request) => (
              <details className="admin-record" key={request.requestId}>
                <summary>
                  <span className="admin-record-primary">
                    <span className={statusClass(request.status)}>{request.status}</span>
                    <strong>{request.centerName}</strong>
                    <small><MapPin size={13} aria-hidden="true" />{request.centerTownship}</small>
                  </span>
                  <span className="admin-record-meta">
                    <span>{request.submittedBy.displayName}</span>
                    <span>{request.estimatedWeightKg.toFixed(2)} kg · ~{request.estimatedPoints} pts</span>
                    <time dateTime={request.createdAt}>{DATE_FORMATTER.format(new Date(request.createdAt))}</time>
                  </span>
                </summary>
                <div className="admin-record-body">
                  <RouteDetails request={request} routeLabel={`${request.centerAddress} · ${request.centerHours}`} />
                  <div className="admin-review-actions">
                    <div className="admin-action-heading"><strong>Edit drop-off</strong><span>Keep center details accurate for the member.</span></div>
                    <div className="admin-form-grid">
                      <label><span>Status</span><select value={request.status} onChange={(event) => updateCenter(request.requestId, { status: event.target.value as AdminCenterDropoffRouteRequest["status"] })}>{RECYCLING_ROUTE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                      <label><span>Center name</span><input value={request.centerName} onChange={(event) => updateCenter(request.requestId, { centerName: event.target.value })} maxLength={180}/></label>
                      <label className="admin-form-wide"><span>Center address</span><textarea value={request.centerAddress} onChange={(event) => updateCenter(request.requestId, { centerAddress: event.target.value })} maxLength={500}/></label>
                      <label><span>Township</span><input value={request.centerTownship} onChange={(event) => updateCenter(request.requestId, { centerTownship: event.target.value })} maxLength={120}/></label>
                      <label><span>Opening hours</span><input value={request.centerHours} onChange={(event) => updateCenter(request.requestId, { centerHours: event.target.value })} maxLength={120}/></label>
                      <label className="admin-form-wide"><span>Internal notes <small>Optional</small></span><textarea value={request.notes ?? ""} onChange={(event) => updateCenter(request.requestId, { notes: event.target.value || null })} maxLength={500}/></label>
                    </div>
                    <RecordActions disabled={savingId === request.requestId} onDelete={() => deleteRequest("center", request.requestId)} onSave={() => saveCenter(request)} />
                  </div>
                </div>
              </details>
            ))}
          </RouteSection>
        ) : null}
      </section>
    </AdminShell>
  );
}

function RouteDetails({ request, routeLabel }: { request: AdminPickupRouteRequest | AdminCenterDropoffRouteRequest; routeLabel: string }) {
  return (
    <div className="admin-report-detail">
      <dl>
        <div><dt>Submitted by</dt><dd>{request.submittedBy.displayName}<br/><span>{request.submittedBy.email}</span></dd></div>
        <div><dt>Submitted</dt><dd>{DATE_FORMATTER.format(new Date(request.createdAt))}</dd></div>
        <div className="admin-detail-wide"><dt>Route details</dt><dd>{routeLabel}</dd></div>
        <div><dt>Estimated load</dt><dd>{request.estimatedWeightKg.toFixed(2)} kg</dd></div>
        <div><dt>Estimated reward</dt><dd>~{request.estimatedPoints} points</dd></div>
        <div className="admin-detail-wide"><dt>Selected items</dt><dd>{selectedItemLine(request)}</dd></div>
        {request.notes ? <div className="admin-detail-wide"><dt>Internal notes</dt><dd>{request.notes}</dd></div> : null}
      </dl>
    </div>
  );
}

function RecordActions({ disabled, onDelete, onSave }: { disabled: boolean; onDelete: () => void; onSave: () => void }) {
  return (
    <div className="admin-action-row admin-action-row--split">
      <button className="button button--danger-ghost" type="button" disabled={disabled} onClick={onDelete}><Trash2 size={16} aria-hidden="true" /> Delete request</button>
      <button className="button button--primary" type="button" disabled={disabled} onClick={onSave}>{disabled ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />} Save changes</button>
    </div>
  );
}

function RouteSection({ children, count, icon, title }: { children: ReactNode; count: number; icon: ReactNode; title: string }) {
  return (
    <section className="admin-route-group" aria-label={title}>
      <header><span>{icon}</span><h3>{title}</h3><small>{count}</small></header>
      <div className="admin-record-list">{children}</div>
    </section>
  );
}
