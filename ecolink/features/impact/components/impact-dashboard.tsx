"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gift,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import type { ImpactDashboardData, ReportStatus } from "@/features/impact/types";
import { useI18n } from "@/lib/i18n";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Yangon",
});

const STATUS_ICONS = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
} satisfies Record<ReportStatus, typeof CheckCircle2>;

function formatPoints(points: number) {
  return `${points > 0 ? "+" : ""}${points} pts`;
}

export function ImpactDashboard({ data }: { data: ImpactDashboardData }) {
  const { t } = useI18n();
  const statusLabels: Record<ReportStatus, string> = {
    PENDING: t("impact.pending"),
    APPROVED: t("impact.approved"),
    REJECTED: t("impact.rejected"),
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Intro Header */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t("impact.kicker")}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
          {t("impact.title", { name: data.displayName })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("impact.subtitle")}
        </Typography>
        <ChipLabel label={data.memberCode} />
      </Box>

      {data.errorMessage && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{data.errorMessage}</Alert>
      )}

      {/* Main Stats Grid */}
      <Stack spacing={2}>
        {/* Points Balance Card */}
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "divider" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
              <Avatar sx={{ bgcolor: "rgba(185, 120, 24, 0.1)", color: "#b97818", width: 38, height: 38 }}>
                <Award size={20} />
              </Avatar>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.secondary" }}>
                {t("impact.points")}
              </Typography>
            </Stack>
            
            <Typography variant="h3" sx={{ fontWeight: 900, color: "secondary.main", mb: 1 }}>
              {data.balance}
            </Typography>

            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("impact.pointsToNext", { count: data.pointsToNextMilestone })}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "secondary.main" }}>
                {data.nextMilestone}
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={data.milestoneProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "rgba(0, 0, 0, 0.05)",
                "& .MuiLinearProgress-bar": {
                  bgcolor: "#b97818",
                },
                mb: 2,
              }}
            />

            <Divider />

            <ListItemButton
              component={Link}
              href="/rewards"
              sx={{ px: 0, py: 1.5, display: "flex", justifyContent: "space-between", "&:hover": { bgcolor: "transparent" } }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Gift size={20} color="#087c78" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{t("impact.usePoints")}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("impact.usePointsHelp")}
                  </Typography>
                </Box>
              </Stack>
              <ArrowRight size={18} color="grey" />
            </ListItemButton>
          </CardContent>
        </Card>

        {/* Reports Status Card */}
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "divider" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
                  {t("impact.reports")}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
                  {t("impact.reviewStatus")}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "secondary.main" }}>
                  {data.totalReportCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">{t("impact.totalReports")}</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: "space-around" }}>
              <StatusLegendDot color="#2d7350" label={t("impact.approved")} count={data.approvedReportCount} />
              <StatusLegendDot color="#b97818" label={t("impact.pending")} count={data.pendingReportCount} />
              <StatusLegendDot color="#b42318" label={t("impact.rejected")} count={data.rejectedReportCount} />
            </Stack>

            <Alert
              severity="info"
              icon={<ShieldCheck size={20} />}
              sx={{ bgcolor: "rgba(8, 124, 120, 0.05)", border: 0, color: "secondary.main", py: 0.5 }}
            >
              <Typography variant="caption">
                {t("impact.noBalanceChange")}
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Stack>

      {/* Points Activity Ledger */}
      <Box>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
            {t("impact.pointsActivity")}
          </Typography>
          <Chip label={t("impact.ledger")} color="success" size="small" />
        </Stack>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {data.ledger.length === 0 ? (
              <Typography variant="body2" sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                {t("impact.noLedger")}
              </Typography>
            ) : (
              data.ledger.slice(0, 6).map((item, index) => (
                <Box key={item.id}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ py: 1.5, px: 2 }}>
                    <ListItemAvatar sx={{ minWidth: 46 }}>
                      <Avatar sx={{ bgcolor: "rgba(8, 118, 111, 0.08)", color: "primary.main", width: 34, height: 34 }}>
                        <Award size={16} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.title}
                      slotProps={{ primary: { variant: "body2", sx: { fontWeight: 800 } } }}
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {item.description}{item.locationText ? ` · ${item.locationText}` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25 }}>
                            <CalendarDays size={11} /> {DATE_FORMATTER.format(new Date(item.recordedAt))}
                          </Typography>
                        </>
                      }
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 900,
                        color: item.points < 0 ? "error.main" : "primary.main",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatPoints(item.points)}
                    </Typography>
                  </ListItem>
                </Box>
              ))
            )}
          </List>
        </Card>
        <Button
          component={Link}
          href="/rewards"
          endIcon={<ArrowRight size={16} />}
          fullWidth
          sx={{ mt: 1.5, justifyContent: "center" }}
        >
          {t("impact.viewRewards")}
        </Button>
      </Box>

      {/* Reports History */}
      <Box>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
            {t("impact.reportHistory")}
          </Typography>
          <Button component={Link} href="/report" size="small" variant="text" sx={{ fontWeight: 700 }}>
            {t("impact.submitReport")}
          </Button>
        </Stack>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {data.reports.length === 0 ? (
              <Typography variant="body2" sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                {t("impact.noReports")}
              </Typography>
            ) : (
              data.reports.slice(0, 6).map((report, index) => {
                const StatusIcon = STATUS_ICONS[report.status];
                const statusColor =
                  report.status === "APPROVED"
                    ? "primary.main"
                    : report.status === "PENDING"
                    ? "warning.main"
                    : "error.main";
                return (
                  <Box key={report.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ py: 1.5, px: 2 }}>
                      <ListItemAvatar sx={{ minWidth: 46 }}>
                        <Avatar sx={{ bgcolor: "rgba(0, 0, 0, 0.04)", color: statusColor, width: 34, height: 34 }}>
                          <StatusIcon size={16} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={report.title}
                        slotProps={{ primary: { variant: "body2", sx: { fontWeight: 800 } } }}
                        secondary={
                          <>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                              <MapPin size={11} /> {report.locationText}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                              <CalendarDays size={11} /> {DATE_FORMATTER.format(new Date(report.createdAt))}
                            </Typography>
                            {report.status === "REJECTED" && (
                              <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.5 }}>
                                {t("impact.reason", { reason: report.rejectionReason ?? t("impact.defaultReject") })}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <Chip
                        label={statusLabels[report.status]}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          fontWeight: 750,
                          bgcolor:
                            report.status === "APPROVED"
                              ? "rgba(45, 115, 80, 0.08)"
                              : report.status === "PENDING"
                              ? "rgba(185, 120, 24, 0.08)"
                              : "rgba(180, 35, 24, 0.08)",
                          color: statusColor,
                        }}
                      />
                    </ListItem>
                  </Box>
                );
              })
            )}
          </List>
        </Card>
      </Box>
    </Box>
  );
}

function ChipLabel({ label }: { label: string }) {
  return (
    <Box
      sx={{
        mt: 1,
        width: "fit-content",
        px: 1.5,
        py: 0.5,
        borderRadius: "12px",
        bgcolor: "rgba(8, 124, 120, 0.08)",
        color: "primary.main",
        fontSize: "0.72rem",
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
      }}
    >
      <CheckCircle2 size={13} />
      {label}
    </Box>
  );
}



function StatusLegendDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "text.secondary", lineHeight: 1.1 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 900, color: "secondary.main" }}>
          {count}
        </Typography>
      </Box>
    </Stack>
  );
}
