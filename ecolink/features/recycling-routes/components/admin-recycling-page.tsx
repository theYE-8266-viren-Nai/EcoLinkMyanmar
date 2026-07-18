"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { CircleDashed, LoaderCircle, Lock, MapPin, RefreshCw, Save, Search, Trash2, Unlock, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { AdminMetric, AdminMetrics, AdminShell } from "@/features/admin/components/admin-shell";
import { AdminPickupLoopMap } from "@/features/recycling-routes/components/admin-pickup-loop-map";
import { RECYCLING_ROUTE_STATUSES, type AdminCenterDropoffRouteRequest, type AdminPickupRouteRequest, type AdminPickupRoutingDashboard, type AdminRouteRequestList, type RecyclingRouteStatus } from "@/features/recycling-routes/types";
import { formatPickupSchedule } from "@/features/recycling-routes/utils/weekly-schedule";

type Message = { kind: "success" | "error"; text: string };
type RouteResponse = { requests: AdminRouteRequestList; routing: AdminPickupRoutingDashboard } | { error: string };

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
  initialRouting,
}: {
  initialError?: string;
  initialRequests: AdminRouteRequestList;
  initialRouting?: AdminPickupRoutingDashboard;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [routing, setRouting] = useState(initialRouting);
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
    setRouting(body.routing);
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
        scheduleId: request.scheduleId ?? routing?.schedule.id,
        latitude: request.latitude,
        longitude: request.longitude,
        notes: request.notes,
      }),
    });
    const body = await readJsonResponse<{ error?: string; warning?: string }>(response);
    setSavingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "Pickup request could not be saved." });
      return;
    }
    setMessage({ kind: body?.warning ? "error" : "success", text: body?.warning ?? "Pickup request saved and draft loops refreshed." });
    await loadRequests();
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
    if (kind === "pickup") await loadRequests();
  }

  async function runRouteAction(action: "dispatch" | "unlock" | "replan") {
    setSavingId(`routes-${action}`);
    setMessage(undefined);
    const response = await fetch("/api/admin/recycling/routes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await readJsonResponse<{ error?: string; warning?: string }>(response);
    setSavingId(undefined);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? "The pickup loops could not be updated." });
      return;
    }
    setMessage({ kind: body?.warning ? "error" : "success", text: body?.warning ?? (action === "dispatch" ? "Both loops are dispatched and locked." : "Pickup loops updated.") });
    await loadRequests();
  }

  return (
    <AdminShell
      activeSection="recycling"
      description="Review member routes, update operational details, and manage request status from one queue."
      isRefreshing={savingId === "refresh"}
      onRefresh={loadRequests}
      title="Recycling submissions"
    >
      <AdminMetrics label="Recycling request summary">
        <AdminMetric label="All requests" value={allRequests.length} detail={`${requests.pickups.length} pickups · ${requests.centerDropoffs.length} drop-offs`} />
        <AdminMetric label="Needs review" value={pendingCount} detail="Currently pending" />
        <AdminMetric label="Completed" value={completedCount} detail="Finished routes" />
      </AdminMetrics>
      {message ? <Alert severity={message.kind} role="status" variant="outlined">{message.text}</Alert> : null}
      {routing ? (
        <Paper component="section" aria-labelledby="pickup-routing-heading" variant="outlined" sx={{ overflow: "hidden", p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between", mb: 2.5 }}>
            <Box>
              <Typography color="primary.main" variant="caption" sx={{ fontWeight: 800 }}>Saturday collection loops</Typography>
              <Typography component="h2" id="pickup-routing-heading" variant="h6" sx={{ color: "secondary.main", fontWeight: 800, mt: 0.25 }}>{formatPickupSchedule(routing.schedule)}</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>{routing.schedule.routeArea} · Two closed routes returning to their starting centers.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", md: "auto" }, "& .MuiButton-root": { minHeight: 48 } }}>
              {routing.schedule.status === "DISPATCHED" ? (
                <Button disabled={savingId?.startsWith("routes-")} onClick={() => runRouteAction("unlock")} startIcon={<Unlock size={17} aria-hidden="true" />} variant="outlined">Unlock and replan</Button>
              ) : (
                <>
                  <Button disabled={savingId?.startsWith("routes-")} onClick={() => runRouteAction("replan")} startIcon={<RefreshCw size={17} aria-hidden="true" />} variant="outlined">Regenerate</Button>
                  <Button disabled={savingId?.startsWith("routes-")} onClick={() => runRouteAction("dispatch")} startIcon={<Lock size={17} aria-hidden="true" />} variant="contained">Dispatch loops</Button>
                </>
              )}
            </Stack>
          </Stack>
          {routing.unroutableAcceptedCount > 0 ? <Alert severity="warning" role="status" sx={{ mb: 2 }}>{routing.unroutableAcceptedCount} accepted pickup(s) need a schedule or confirmed map pin.</Alert> : null}
          <AdminPickupLoopMap routes={routing.routes} />
          <div className="pickup-route-summary-grid">
            {routing.routes.map((route) => (
              <article className={`pickup-route-summary pickup-route-summary--${route.routeCode.toLowerCase()}`} key={route.id}>
                <div><span>Route {route.routeCode}</span><strong>{route.centerName}</strong></div>
                <dl><div><dt>Stops</dt><dd>{route.stops.length}</dd></div><div><dt>Distance</dt><dd>{(route.distanceMeters / 1000).toFixed(1)} km</dd></div><div><dt>Drive time</dt><dd>{Math.round(route.durationSeconds / 60)} min</dd></div><div><dt>Status</dt><dd>{route.status}</dd></div></dl>
                {route.generationError ? <p role="status">{route.generationError}</p> : null}
                {route.stops.length > 0 ? <ol>{route.stops.map((stop) => <li key={stop.pickupRequestId}><b>{stop.stopOrder}</b><span>{stop.pickupAddress}<small>{stop.submittedBy.displayName}{stop.estimatedArrivalAt ? ` · ETA ${new Date(stop.estimatedArrivalAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Yangon" })}` : ""}</small></span></li>)}</ol> : <p>No accepted pickups assigned.</p>}
              </article>
            ))}
          </div>
        </Paper>
      ) : null}
      <Paper component="section" aria-label="Recycling request records" variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack spacing={2} sx={{ bgcolor: "#fbfdfd", borderBottom: 1, borderColor: "divider", p: 2 }}>
          <Box>
            <Typography component="h2" variant="subtitle1" sx={{ color: "secondary.main", fontWeight: 800 }}>Request directory</Typography>
            <Typography color="text.secondary" variant="caption">{visibleCount} of {allRequests.length} requests</Typography>
          </Box>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
            <ToggleButtonGroup
              aria-label="Filter by route type"
              exclusive
              fullWidth
              onChange={(_, value: "all" | "pickup" | "center" | null) => value && setRouteFilter(value)}
              size="small"
              sx={{ maxWidth: { lg: 320 }, "& .MuiToggleButton-root": { minHeight: 48, textTransform: "none" } }}
              value={routeFilter}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="pickup">Pickups</ToggleButton>
              <ToggleButton value="center">Drop-offs</ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: { lg: 180 }, "& .MuiInputBase-root": { minHeight: 48 } }}>
              <InputLabel id="admin-status-filter-label">Status</InputLabel>
              <Select label="Status" labelId="admin-status-filter-label" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | RecyclingRouteStatus)}>
                <MenuItem value="ALL">All statuses</MenuItem>
                {RECYCLING_ROUTE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              aria-label="Search recycling requests"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search member, route, or item…"
              size="small"
              slotProps={{ input: { startAdornment: <Search size={17} aria-hidden="true" /> } }}
              sx={{ flex: 1, "& .MuiInputBase-root": { gap: 1, minHeight: 48 } }}
              type="search"
              value={query}
              variant="outlined"
            />
          </Stack>
        </Stack>

        {visibleCount === 0 ? (
          <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary", px: 2, py: 7, textAlign: "center" }}><Search size={24} aria-hidden="true" /><Typography color="text.primary" sx={{ fontWeight: 800 }}>No matching requests</Typography><Typography variant="body2">Adjust the route type, status, or search terms to see more records.</Typography></Stack>
        ) : null}

        {filteredRequests.pickups.length > 0 ? (
          <RouteSection count={filteredRequests.pickups.length} icon={<CircleDashed size={17} aria-hidden="true" />} title="Scheduled pickups">
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
                    <Box sx={{ mb: 2 }}><Typography sx={{ fontWeight: 800 }}>Edit pickup</Typography><Typography color="text.secondary" variant="body2">Update the fulfillment status and route information.</Typography></Box>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                      <TextField label="Status" select value={request.status} onChange={(event) => updatePickup(request.requestId, { status: event.target.value as AdminPickupRouteRequest["status"] })} variant="outlined">{RECYCLING_ROUTE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>
                      <TextField label="Route window" value={request.routeWindow} slotProps={{ input: { readOnly: true } }} variant="outlined" />
                      <TextField label="Pickup address" value={request.pickupAddress} onChange={(event) => updatePickup(request.requestId, { pickupAddress: event.target.value })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { sm: "1 / -1" } }} variant="outlined" />
                      <TextField label="Latitude" type="number" value={request.latitude ?? ""} onChange={(event) => updatePickup(request.requestId, { latitude: event.target.value === "" ? null : Number(event.target.value) })} slotProps={{ htmlInput: { step: "any" } }} variant="outlined" />
                      <TextField label="Longitude" type="number" value={request.longitude ?? ""} onChange={(event) => updatePickup(request.requestId, { longitude: event.target.value === "" ? null : Number(event.target.value) })} slotProps={{ htmlInput: { step: "any" } }} variant="outlined" />
                      <TextField label="Internal notes (optional)" value={request.notes ?? ""} onChange={(event) => updatePickup(request.requestId, { notes: event.target.value || null })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { sm: "1 / -1" } }} variant="outlined" />
                    </Box>
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
                    <Box sx={{ mb: 2 }}><Typography sx={{ fontWeight: 800 }}>Edit drop-off</Typography><Typography color="text.secondary" variant="body2">Keep center details accurate for the member.</Typography></Box>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                      <TextField label="Status" select value={request.status} onChange={(event) => updateCenter(request.requestId, { status: event.target.value as AdminCenterDropoffRouteRequest["status"] })} variant="outlined">{RECYCLING_ROUTE_STATUSES.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>
                      <TextField label="Center name" value={request.centerName} onChange={(event) => updateCenter(request.requestId, { centerName: event.target.value })} slotProps={{ htmlInput: { maxLength: 180 } }} variant="outlined" />
                      <TextField label="Center address" value={request.centerAddress} onChange={(event) => updateCenter(request.requestId, { centerAddress: event.target.value })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { sm: "1 / -1" } }} variant="outlined" />
                      <TextField label="Township" value={request.centerTownship} onChange={(event) => updateCenter(request.requestId, { centerTownship: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} variant="outlined" />
                      <TextField label="Opening hours" value={request.centerHours} onChange={(event) => updateCenter(request.requestId, { centerHours: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} variant="outlined" />
                      <TextField label="Internal notes (optional)" value={request.notes ?? ""} onChange={(event) => updateCenter(request.requestId, { notes: event.target.value || null })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { sm: "1 / -1" } }} variant="outlined" />
                    </Box>
                    <RecordActions disabled={savingId === request.requestId} onDelete={() => deleteRequest("center", request.requestId)} onSave={() => saveCenter(request)} />
                  </div>
                </div>
              </details>
            ))}
          </RouteSection>
        ) : null}
      </Paper>
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
    <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", mt: 2, "& .MuiButton-root": { minHeight: 48 } }}>
      <Button color="error" disabled={disabled} onClick={onDelete} startIcon={<Trash2 size={17} aria-hidden="true" />} variant="text">Delete request</Button>
      <Button disabled={disabled} onClick={onSave} startIcon={disabled ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />} variant="contained">Save changes</Button>
    </Stack>
  );
}

function RouteSection({ children, count, icon, title }: { children: ReactNode; count: number; icon: ReactNode; title: string }) {
  return (
    <section className="admin-route-group" aria-label={title}>
      <Stack component="header" direction="row" spacing={1} sx={{ alignItems: "center", px: 2, py: 1.5 }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>{icon}</Box>
        <Typography component="h3" variant="subtitle2" sx={{ color: "secondary.main", fontWeight: 800 }}>{title}</Typography>
        <Typography component="span" color="text.secondary" variant="caption" sx={{ ml: "auto" }}>{count}</Typography>
      </Stack>
      <div className="admin-record-list">{children}</div>
    </section>
  );
}
