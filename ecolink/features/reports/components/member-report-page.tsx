"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Camera, CheckCircle2, LocateFixed, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import { useI18n } from "@/lib/i18n";

type ReportFormState = {
  image?: File;
  latitude?: number;
  longitude?: number;
};

type LocationStatus = "locating" | "ready" | "error" | "unsupported";

const EMPTY_FORM: ReportFormState = {};

async function readJsonResponse<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

export function MemberReportPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState<ReportFormState>(EMPTY_FORM);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("locating");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>();

  const hasLocation = typeof form.latitude === "number" && typeof form.longitude === "number";

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }));
        setLocationStatus("ready");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      queueMicrotask(() => setLocationStatus("unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }));
        setLocationStatus("ready");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  function updateForm(update: Partial<ReportFormState>) {
    setForm((current) => ({ ...current, ...update }));
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.image) {
      setMessage({ kind: "error", text: t("report.addImageError") });
      return;
    }
    if (!hasLocation) {
      setMessage({ kind: "error", text: t("report.locationRequired") });
      return;
    }

    setSubmitting(true);
    setMessage(undefined);
    const formData = new FormData();
    formData.set("image", form.image);
    formData.set("latitude", String(form.latitude));
    formData.set("longitude", String(form.longitude));

    const response = await fetch("/api/reports", { method: "POST", body: formData });
    const body = await readJsonResponse<{ error?: string }>(response);
    setSubmitting(false);
    if (!response.ok) {
      setMessage({ kind: "error", text: body?.error ?? t("report.submitError") });
      return;
    }

    router.push("/report/history");
  }

  const locationCopy =
    locationStatus === "ready"
      ? t("report.locationCaptured")
      : locationStatus === "locating"
        ? t("report.locating")
        : t("report.locationPermission");

  return (
    <AppShell>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 1 }}>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", letterSpacing: 0.8, textTransform: "uppercase" }}>
            {t("report.kicker")}
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1, mt: 0.5 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 850, color: "secondary.main", lineHeight: 1.15 }}>
                {t("report.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, pr: 1 }}>
                {t("report.subtitle")}
              </Typography>
            </Box>
            <Button component={Link} href="/report/history" variant="outlined" size="small" sx={{ minHeight: 40, flexShrink: 0, borderRadius: 2, px: 1.25 }}>
              {t("report.history")}
            </Button>
          </Stack>
        </Box>

        {message ? <Alert severity={message.kind} sx={{ borderRadius: 2 }}>{message.text}</Alert> : null}

        <Card
          variant="outlined"
          sx={{ borderRadius: 3, borderWidth: 1.5, borderColor: "rgba(8, 118, 111, 0.26)", boxShadow: "0 6px 18px rgba(13, 56, 86, 0.06)" }}
        >
          <CardContent component="form" onSubmit={submitReport} sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ color: "secondary.main", fontWeight: 850 }}>
                  {t("report.submitTitle")}
                </Typography>
                <Typography variant="caption" color="text.secondary">{t("report.submitHelp")}</Typography>
              </Box>

              <Button
                variant="outlined"
                component="label"
                startIcon={<Camera size={19} />}
                fullWidth
                sx={{ minHeight: 112, borderRadius: 2.5, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "column", gap: 0.75 }}
              >
                <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
                  {form.image ? t("report.changePhoto") : t("report.uploadPhoto")}
                </Typography>
                <Typography component="span" variant="caption" color="text.secondary">
                  {form.image ? `${form.image.name} · ${Math.max(1, Math.round(form.image.size / 1024))} KB` : t("report.cameraLibrary")}
                </Typography>
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => updateForm({ image: event.target.files?.[0] })} />
              </Button>

              <Box
                sx={{ border: "1px solid", borderColor: locationStatus === "ready" ? "success.main" : "divider", borderRadius: 2.5, bgcolor: locationStatus === "ready" ? "rgba(45, 115, 80, 0.05)" : "background.default", p: 1.5 }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  <Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: locationStatus === "ready" ? "success.main" : "rgba(8, 118, 111, 0.12)", color: locationStatus === "ready" ? "success.contrastText" : "primary.main", flexShrink: 0 }}>
                    {locationStatus === "locating" ? <CircularProgress size={19} color="inherit" /> : locationStatus === "ready" ? <CheckCircle2 size={20} /> : <LocateFixed size={20} />}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{locationCopy}</Typography>
                    {hasLocation ? (
                      <Typography variant="caption" color="text.secondary">{t("report.coordinates", { lat: form.latitude?.toFixed(6) ?? "", lng: form.longitude?.toFixed(6) ?? "" })}</Typography>
                    ) : null}
                  </Box>
                  {locationStatus === "error" || locationStatus === "unsupported" ? <Button type="button" onClick={requestLocation} size="small" sx={{ minHeight: 36 }}>{t("report.retry")}</Button> : null}
                </Stack>
              </Box>

              <Button type="submit" variant="contained" disabled={submitting || !form.image || !hasLocation} endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Navigation size={18} />} fullWidth size="large" sx={{ minHeight: 52, borderRadius: 2 }}>
                {submitting ? t("report.submitting") : t("report.send")}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Button component={Link} href="/report/history" variant="text" startIcon={<MapPin size={18} />} sx={{ alignSelf: "center", fontWeight: 800, minHeight: 44 }}>
          {t("report.yourReports")}
        </Button>
      </Box>
    </AppShell>
  );
}
