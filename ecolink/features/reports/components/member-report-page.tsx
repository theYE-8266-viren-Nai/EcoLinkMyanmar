"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Camera, ChevronRight, LocateFixed, MapPin, RefreshCw } from "lucide-react";
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Intro */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
            Community Action
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
            Report an environmental issue
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Reports are reviewed by admins before any points are awarded.
          </Typography>
        </Box>

        {message && (
          <Alert severity={message.kind} sx={{ borderRadius: 2 }}>
            {message.text}
          </Alert>
        )}

        {/* Report Form Workspace */}
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2 }} component="form" onSubmit={submitReport}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main", mb: 0.5 }}>
              Submit Report
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Add photo evidence and your current location.
            </Typography>

            <Stack spacing={2.5}>
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<Camera size={18} />}
                  fullWidth
                  sx={{ minHeight: 48, borderRadius: 2 }}
                >
                  {form.image ? "Change Photo" : "Upload Photo Evidence"}
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => updateForm({ image: event.target.files?.[0] })}
                  />
                </Button>
                {form.image && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {form.image.name} ({Math.max(1, Math.round(form.image.size / 1024))} KB)
                  </Typography>
                )}
              </Box>

              <Button
                variant="outlined"
                color={hasLocation ? "success" : "primary"}
                onClick={useLocation}
                startIcon={<LocateFixed size={18} />}
                fullWidth
                sx={{
                  minHeight: 48,
                  borderRadius: 2,
                  borderColor: hasLocation ? "success.main" : "divider",
                  bgcolor: hasLocation ? "rgba(45, 115, 80, 0.04)" : "transparent",
                }}
              >
                {hasLocation ? "Location Captured" : "Use My Current Location"}
              </Button>
              {hasLocation && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                  Coordinates: {form.latitude?.toFixed(6)}, {form.longitude?.toFixed(6)}
                </Typography>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !form.image || !hasLocation}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <ChevronRight size={18} />}
                fullWidth
                size="large"
              >
                {submitting ? "Submitting..." : "Send Report"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* History List */}
        <Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
                Your Reports
              </Typography>
              <Typography variant="caption" color="text.secondary">Report history</Typography>
            </Box>
            <IconButton onClick={loadReports} disabled={refreshing} color="primary">
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </IconButton>
          </Stack>

          <Stack spacing={1.5}>
            {reports.length === 0 ? (
              <Typography variant="body2" sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                No reports submitted yet.
              </Typography>
            ) : (
              reports.map((report) => {
                const statusColor =
                  report.status === "APPROVED"
                    ? "success.main"
                    : report.status === "PENDING"
                    ? "warning.main"
                    : "error.main";
                return (
                  <Card key={report.id} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {report.title}
                        </Typography>
                        <ChipLabel
                          label={STATUS_LABELS[report.status]}
                          color={statusColor}
                          bgcolor={
                            report.status === "APPROVED"
                              ? "rgba(45, 115, 80, 0.08)"
                              : report.status === "PENDING"
                              ? "rgba(185, 120, 24, 0.08)"
                              : "rgba(180, 35, 24, 0.08)"
                          }
                        />
                      </Stack>

                      {report.photoUrl && (
                        <Box sx={{ width: "100%", height: 180, position: "relative", borderRadius: 2, overflow: "hidden", my: 1.5 }}>
                          <Image
                            alt="Submitted report photo"
                            src={report.photoUrl}
                            fill
                            style={{ objectFit: "cover" }}
                            unoptimized
                          />
                        </Box>
                      )}

                      <Stack spacing={0.5} sx={{ color: "text.secondary" }}>
                        <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <MapPin size={12} /> {report.locationText}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block" }}>
                          Submitted · {DATE_FORMATTER.format(new Date(report.createdAt))}
                        </Typography>
                        {report.photoStoragePath && (
                          <Typography variant="caption" sx={{ fontSize: "0.62rem", display: "block" }}>
                            Image attached · {report.photoStoragePath.split("/").at(-1)}
                          </Typography>
                        )}
                      </Stack>

                      {report.status === "PENDING" && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, fontStyle: "italic" }}>
                          Your report is awaiting admin approval.
                        </Typography>
                      )}
                      {report.status === "REJECTED" && (
                        <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 1.5, fontWeight: 700 }}>
                          Rejection Reason: {report.rejectionReason ?? "This report was not approved."}
                        </Typography>
                      )}
                      {report.status === "APPROVED" && (
                        <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 1.5, fontWeight: 800 }}>
                          {report.pointsAwarded ?? 0} points rewarded!
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Stack>
        </Box>
        
        <Button
          component={Link}
          href="/dashboard"
          fullWidth
          variant="text"
          sx={{ alignSelf: "center", fontWeight: 700, mt: 1 }}
        >
          View dashboard
        </Button>
      </Box>
    </AppShell>
  );
}

function ChipLabel({ label, color, bgcolor }: { label: string; color: string; bgcolor: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: "10px",
        bgcolor,
        color,
        fontSize: "0.65rem",
        fontWeight: 800,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Box>
  );
}
