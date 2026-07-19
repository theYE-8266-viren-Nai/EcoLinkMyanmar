"use client";

import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { AlertTriangle, Brain, CheckCircle2, ChevronDown, ImageIcon, MapPin, Search, UserRound, XCircle } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { AdminMetric, AdminMetrics, AdminShell } from "@/features/admin/components/admin-shell";
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

const SCORE_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Returns a MUI color name based on a dirtiness score 1–10. */
function dirtinessColor(score: number): "success" | "warning" | "error" {
  if (score <= 3) return "success";
  if (score <= 6) return "warning";
  return "error";
}

/** Human-readable severity label for the dirtiness score. */
function dirtinessLabel(score: number): string {
  if (score <= 3) return "Clean";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "Dirty";
  return "Very Dirty";
}

function AiRatingSection({ report }: { report: AdminPendingReport }) {
  const hasAi = report.aiDirtinessScore !== null;

  if (!hasAi) {
    return (
      <Box sx={{ alignItems: "center", bgcolor: "action.hover", borderRadius: 1.5, color: "text.secondary", display: "flex", gap: 1, p: 2 }}>
        <Brain size={17} aria-hidden="true" />
        <Typography variant="body2">AI environment scan not available for this report.</Typography>
      </Box>
    );
  }

  const score = report.aiDirtinessScore!;
  const color = dirtinessColor(score);
  const progressValue = ((score - 1) / 9) * 100;

  return (
    <Box sx={{ bgcolor: "background.default", border: 1, borderColor: "divider", borderRadius: 1.5, p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        <Brain size={16} aria-hidden="true" style={{ color: "inherit", opacity: 0.7 }} />
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
          AI Environment Rating
        </Typography>
      </Stack>

      {/* Score + bar */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Dirtiness Score
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Chip
                color={color}
                label={dirtinessLabel(score)}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: 11 }}
              />
              <Typography sx={{ color: `${color}.main`, fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
                {score}<Typography component="span" variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>/10</Typography>
              </Typography>
            </Stack>
          </Stack>
          <LinearProgress
            aria-label={`Dirtiness score ${score} out of 10`}
            color={color}
            value={progressValue}
            variant="determinate"
            sx={{ borderRadius: 1, height: 8 }}
          />
        </Box>
      </Stack>

      {/* Confidence */}
      {report.aiConfidence !== null && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, minWidth: 80 }}>
            Confidence
          </Typography>
          <Tooltip title={`Raw value: ${report.aiConfidence.toFixed(3)}`} placement="top">
            <Chip
              label={`${Math.round(report.aiConfidence * 100)}%`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
          </Tooltip>
        </Stack>
      )}

      {/* Reasoning */}
      {report.aiReasoning && (
        <Box sx={{ mb: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700, mb: 0.25 }}>
            AI Reasoning
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: "italic", lineHeight: 1.6 }}>
            &ldquo;{report.aiReasoning}&rdquo;
          </Typography>
        </Box>
      )}

      {/* Warnings */}
      {report.aiWarnings.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700, mb: 0.5 }}>
            Warnings
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
            {report.aiWarnings.map((warning) => (
              <Chip
                icon={<AlertTriangle size={13} aria-hidden="true" />}
                key={warning}
                label={warning}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: 11, fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

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
  const aiRatedCount = reports.filter((report) => report.aiDirtinessScore !== null).length;
  const avgDirtiness = aiRatedCount > 0
    ? reports.filter((r) => r.aiDirtinessScore !== null).reduce((sum, r) => sum + r.aiDirtinessScore!, 0) / aiRatedCount
    : null;

  async function loadReports() {
    setRefreshing(true);
    const response = await fetch("/api/admin/reports", { cache: "no-store" });
    const body = await readJsonResponse<PendingReportsResponse>(response);
    setRefreshing(false);
    if (!response.ok || !body || "error" in body) {
      setMessage({ kind: "error", text: body && "error" in body ? body.error : t("admin.loadPendingError") });
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
      setMessage({ kind: "error", text: body?.error ?? t("admin.reviewError") });
      return;
    }
    setMessage({ kind: "success", text: action === "approve" ? t("admin.reportApproved") : t("admin.reportRejected") });
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
      <AdminMetrics label={t("admin.moderationSummary")}>
        <AdminMetric label={t("admin.pending")} value={reports.length} detail={t("admin.awaitingDecision")} />
        <AdminMetric label={t("admin.highPriority")} value={highPriorityCount} detail={t("admin.highPriorityDetail")} />
        <AdminMetric label={t("admin.withEvidence")} value={evidenceCount} detail={t("admin.photoAttached")} />
        <AdminMetric
          label="AI Rated"
          value={aiRatedCount}
          detail={avgDirtiness !== null ? `Avg score: ${SCORE_FORMATTER.format(avgDirtiness)}/10` : "No AI data yet"}
        />
      </AdminMetrics>
      {message ? <Alert severity={message.kind} role="status" variant="outlined">{message.text}</Alert> : null}
      <Paper component="section" aria-label={t("admin.queue")} variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, bgcolor: "#fbfdfd", borderBottom: 1, borderColor: "divider", justifyContent: "space-between", p: 2 }}>
          <Box>
            <Typography component="h2" variant="subtitle1" sx={{ color: "secondary.main", fontWeight: 800 }}>{t("admin.moderationQueue")}</Typography>
            <Typography color="text.secondary" variant="caption">{t("admin.reportCount", { visible: filteredReports.length, total: reports.length })}</Typography>
          </Box>
          <TextField
            aria-label={t("admin.searchPending")}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            size="small"
            slotProps={{ input: { startAdornment: <Search size={17} aria-hidden="true" /> } }}
            sx={{ maxWidth: { sm: 340 }, minWidth: { sm: 280 }, "& .MuiInputBase-root": { gap: 1, minHeight: 48 } }}
            type="search"
            value={query}
            variant="outlined"
          />
        </Stack>

          {reports.length === 0 ? (
            <EmptyQueue icon={<CheckCircle2 size={24} aria-hidden="true" />} title={t("admin.queueCleared")} description={t("admin.empty")} />
          ) : filteredReports.length === 0 ? (
            <EmptyQueue icon={<Search size={24} aria-hidden="true" />} title={t("admin.noMatches")} description={t("admin.noMatchesHelp")} />
          ) : (
            <Box>
              {filteredReports.map((report) => (
                <Accordion disableGutters elevation={0} key={report.id} sx={{ "&:before": { display: "none" }, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                  <AccordionSummary expandIcon={<ChevronDown size={19} aria-hidden="true" />} sx={{ minHeight: 72, px: { xs: 2, md: 2.5 }, "& .MuiAccordionSummary-content": { my: 1.5, minWidth: 0 } }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 1, md: 3 }} sx={{ justifyContent: "space-between", minWidth: 0, width: "100%" }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", minWidth: 0 }}>
                        <Chip color="warning" label={t("admin.pending")} size="small" variant="outlined" />
                        {report.aiDirtinessScore !== null && (
                          <Chip
                            color={dirtinessColor(report.aiDirtinessScore)}
                            label={`AI: ${report.aiDirtinessScore}/10`}
                            size="small"
                            variant="filled"
                            sx={{ fontWeight: 700, fontSize: 11 }}
                          />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 750 }} noWrap>{report.title}</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "text.secondary" }}><MapPin size={14} aria-hidden="true" /><Typography variant="caption" noWrap>{report.locationText}</Typography></Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={{ xs: 1.5, sm: 3 }} sx={{ alignItems: "center", color: "text.secondary", flexWrap: "wrap", pr: 1 }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}><UserRound size={14} aria-hidden="true" /><Typography variant="caption">{report.submittedBy.displayName}</Typography></Stack>
                        <Typography variant="caption">{report.issueType} · {report.severity}</Typography>
                        <Typography component="time" dateTime={report.createdAt} variant="caption">{DATE_FORMATTER.format(new Date(report.createdAt))}</Typography>
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "#fbfdfd", borderTop: 1, borderColor: "divider", p: { xs: 2, md: 3 } }}>
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
                      <Stack spacing={2.5} sx={{ flex: "1 1 60%", minWidth: 0 }}>
                        {report.photoUrl ? <Image alt={t("admin.submittedEvidenceAlt")} height={293} src={report.photoUrl} style={{ borderRadius: 8, height: "auto", maxHeight: 360, objectFit: "cover", width: "100%" }} unoptimized width={520} /> : <Box sx={{ alignItems: "center", bgcolor: "action.hover", borderRadius: 1, color: "text.secondary", display: "flex", gap: 1, justifyContent: "center", minHeight: 180 }}><ImageIcon size={22} aria-hidden="true" /><Typography variant="body2">{t("admin.noImage")}</Typography></Box>}
                        <Box component="dl" sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, m: 0 }}>
                          <Detail label={t("admin.submittedBy")} value={`${report.submittedBy.displayName} · ${report.submittedBy.email}`} />
                          <Detail label={t("admin.date")} value={DATE_FORMATTER.format(new Date(report.createdAt))} />
                          <Detail label={t("admin.issue")} value={report.issueType} />
                          <Detail label={t("admin.severity")} value={report.severity} />
                          <Detail label={t("admin.location")} value={report.locationText} />
                          <Detail label={t("admin.image")} value={report.photoStoragePath ? report.photoStoragePath.split("/").pop() ?? t("admin.noImage") : t("admin.noImage")} />
                          <Box sx={{ gridColumn: { sm: "1 / -1" } }}><Detail label={t("admin.details")} value={report.details ?? t("admin.noDetails")} /></Box>
                        </Box>

                        {/* AI Environment Measurement */}
                        <AiRatingSection report={report} />
                      </Stack>
                      <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", lg: "block" } }} />
                      <Stack spacing={2} sx={{ flex: "0 1 360px" }}>
                        <Box><Typography sx={{ fontWeight: 800 }}>{t("admin.reviewDecision")}</Typography><Typography color="text.secondary" variant="body2">{t("admin.reviewDecisionHelp")}</Typography></Box>
                        <TextField label={`${t("admin.rejectReason")} (${t("admin.optional")})`} value={rejectionReasons[report.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [report.id]: event.target.value }))} minRows={3} maxRows={6} multiline slotProps={{ htmlInput: { maxLength: 300 } }} placeholder={t("admin.rejectPlaceholder")} variant="outlined" />
                        <Stack direction={{ xs: "column", sm: "row", lg: "column" }} spacing={1.5}>
                          <Button disabled={actingId === report.id} onClick={() => reviewReport(report.id, "approve")} startIcon={actingId === report.id ? <CircularProgress color="inherit" size={17} /> : <CheckCircle2 size={17} />} variant="contained">{t("admin.approve")}</Button>
                          <Button color="error" disabled={actingId === report.id} onClick={() => reviewReport(report.id, "reject")} startIcon={<XCircle size={17} />} variant="outlined">{t("admin.reject")}</Button>
                        </Stack>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
      </Paper>
    </AdminShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <Box><Typography component="dt" color="text.secondary" variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography><Typography component="dd" variant="body2" sx={{ m: 0, mt: 0.25, overflowWrap: "anywhere" }}>{value}</Typography></Box>;
}

function EmptyQueue({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary", px: 2, py: 7, textAlign: "center" }}>{icon}<Typography color="text.primary" sx={{ fontWeight: 800 }}>{title}</Typography><Typography variant="body2">{description}</Typography></Stack>;
}
