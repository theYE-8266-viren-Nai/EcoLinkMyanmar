"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import type { MemberReport } from "@/features/reports/types";
import { useI18n } from "@/lib/i18n";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Yangon" });

type ReportsResponse = { reports: MemberReport[] } | { error: string };

async function readJsonResponse<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

export function MemberReportHistoryPage({ initialReports, initialError }: { initialReports: MemberReport[]; initialError?: string }) {
  const { t } = useI18n();
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState(initialError);
  const [refreshing, setRefreshing] = useState(false);
  const statusLabels = { PENDING: t("impact.pending"), APPROVED: t("impact.approved"), REJECTED: t("impact.rejected") } as const;

  async function refreshReports() {
    setRefreshing(true);
    const response = await fetch("/api/reports", { cache: "no-store" });
    const body = await readJsonResponse<ReportsResponse>(response);
    setRefreshing(false);
    if (!response.ok || !body || "error" in body) {
      setMessage(body && "error" in body ? body.error : "Could not load reports.");
      return;
    }
    setReports(body.reports);
    setMessage(undefined);
  }

  return (
    <AppShell>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25, pb: 1 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Button component={Link} href="/report" startIcon={<ArrowLeft size={18} />} sx={{ minHeight: 44, fontWeight: 800, px: 0.5 }}>
            {t("report.submitTitle")}
          </Button>
          <IconButton onClick={refreshReports} disabled={refreshing} aria-label="Refresh report history" color="primary" sx={{ minWidth: 44, minHeight: 44 }}>
            <RefreshCw size={19} className={refreshing ? "spin" : ""} />
          </IconButton>
        </Stack>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", letterSpacing: 0.8, textTransform: "uppercase" }}>{t("report.kicker")}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 850, color: "secondary.main", mt: 0.5 }}>{t("report.yourReports")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t("report.history")}</Typography>
        </Box>

        {message ? <Alert severity="error" sx={{ borderRadius: 2 }}>{message}</Alert> : null}

        <Stack spacing={1.5}>
          {reports.length === 0 ? (
            <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: "dashed" }}><CardContent sx={{ p: 3, textAlign: "center" }}><Typography variant="body2" color="text.secondary">{t("report.empty")}</Typography></CardContent></Card>
          ) : reports.map((report) => {
            const statusColor = report.status === "APPROVED" ? "success.main" : report.status === "PENDING" ? "warning.main" : "error.main";
            const statusBackground = report.status === "APPROVED" ? "rgba(45, 115, 80, 0.08)" : report.status === "PENDING" ? "rgba(185, 120, 24, 0.08)" : "rgba(180, 35, 24, 0.08)";
            return (
              <Card key={report.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", borderColor: "divider" }}>
                {report.photoUrl ? <Box sx={{ width: "100%", height: 168, position: "relative", bgcolor: "muted.main" }}><Image alt="Submitted report photo" src={report.photoUrl} fill sizes="448px" style={{ objectFit: "cover" }} unoptimized /></Box> : null}
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 850, pr: 1 }}>{report.title}</Typography>
                    <Box sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: statusBackground, color: statusColor, fontSize: "0.65rem", fontWeight: 850, whiteSpace: "nowrap" }}>{statusLabels[report.status]}</Box>
                  </Stack>
                  <Stack spacing={0.5} sx={{ mt: 1.5, color: "text.secondary" }}>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><MapPin size={13} /> {report.locationText}</Typography>
                    <Typography variant="caption">{t("report.submitted", { date: DATE_FORMATTER.format(new Date(report.createdAt)) })}</Typography>
                  </Stack>
                  {report.status === "PENDING" ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25, fontStyle: "italic" }}>{t("report.awaiting")}</Typography> : null}
                  {report.status === "REJECTED" ? <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 1.25, fontWeight: 700 }}>{t("report.rejectionReason", { reason: report.rejectionReason ?? t("report.defaultRejection") })}</Typography> : null}
                  {report.status === "APPROVED" ? <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 1.25, fontWeight: 850 }}>{t("report.pointsRewarded", { count: report.pointsAwarded ?? 0 })}</Typography> : null}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Box>
    </AppShell>
  );
}
