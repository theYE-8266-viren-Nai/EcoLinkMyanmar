"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Navigation,
  RotateCcw,
  Scale,
  Sparkles,
  Truck,
  TriangleAlert,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import { calculatePoints, MATERIALS, PARTNER_CENTERS, type MaterialSlug } from "@/lib/ecolink-data";
import { useI18n } from "@/lib/i18n";
import type { AiScanResponse } from "@/schemas/ai-scan";

type FulfillmentOption = "truck" | "center" | null;

type PickupFormState = {
  address: string;
  date: string;
  notes: string;
  window: string;
};

const initialPickupForm: PickupFormState = {
  address: "",
  date: "",
  notes: "",
  window: "Tomorrow · 8:00 AM-11:00 AM",
};

function isMaterialSlug(value: string | null): value is MaterialSlug {
  return MATERIALS.some((material) => material.slug === value);
}

function detectionKey(index: number) {
  return `detection-${index}`;
}

function estimatePoints(materialSlug: MaterialSlug | null, weightKg: number) {
  if (!materialSlug || !Number.isFinite(weightKg) || weightKg <= 0) return 0;
  return calculatePoints(materialSlug, weightKg);
}

function isPlasticBottleDetection(detection: { itemType: string; materialLabel: string; materialSlug: MaterialSlug | null }) {
  const searchableLabel = `${detection.itemType} ${detection.materialLabel}`.toLowerCase();
  return searchableLabel.includes("bottle") && (
    detection.materialSlug === null ||
    detection.materialSlug === "pet-plastic" ||
    detection.materialSlug === "rigid-plastic" ||
    searchableLabel.includes("plastic")
  );
}

function estimateDetectionPoints(detection: { estimatedCount: number; estimatedWeightKg: number; itemType: string; materialLabel: string; materialSlug: MaterialSlug | null }) {
  if (isPlasticBottleDetection(detection)) {
    return Number.isFinite(detection.estimatedCount) && detection.estimatedCount > 0
      ? detection.estimatedCount
      : Math.max(1, Math.round(detection.estimatedWeightKg / 0.025));
  }
  return estimatePoints(detection.materialSlug, detection.estimatedWeightKg);
}

function formatPoints(points: number) {
  if (!Number.isFinite(points)) return "0";
  return Number.isInteger(points) ? points.toString() : points.toFixed(1);
}

function materialName(slug: MaterialSlug) {
  return MATERIALS.find((material) => material.slug === slug)?.name ?? slug;
}

function materialInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default function RecyclePage() {
  const { t } = useI18n();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | undefined>(undefined);
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<AiScanResponse>();
  const [selectedDetectionKeys, setSelectedDetectionKeys] = useState<string[]>([]);
  const [uploadOptionsOpen, setUploadOptionsOpen] = useState(false);
  const [pickupDrawerOpen, setPickupDrawerOpen] = useState(false);
  const [pickupPrepared, setPickupPrepared] = useState(false);
  const [pickupForm, setPickupForm] = useState<PickupFormState>(initialPickupForm);
  const [fulfillmentOption, setFulfillmentOption] = useState<FulfillmentOption>(null);
  const [submissionState, setSubmissionState] = useState<"idle" | "submitted">("idle");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextPreviewUrl;
    setFile(nextFile);
    setPreviewUrl(nextPreviewUrl);
    setResult(undefined);
    setSelectedDetectionKeys([]);
    setSubmissionState("idle");
    setFulfillmentOption(null);
    setPickupPrepared(false);
    setPickupForm(initialPickupForm);
    setError("");
    setUploadOptionsOpen(false);
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function analyze() {
    if (!file) {
      setError(t("recycle.choosePhotoError"));
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(undefined);
    setSubmissionState("idle");
    setFulfillmentOption(null);
    setPickupPrepared(false);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/ai/scans", { method: "POST", body: formData });
      const body = await response.json() as AiScanResponse | { error?: string; reason?: string };
      if (!response.ok) {
        throw new Error("reason" in body ? body.reason : "error" in body ? body.error : t("recycle.aiError"));
      }
      const scanResult = body as AiScanResponse;
      setResult(scanResult);
      setSelectedDetectionKeys(scanResult.detections.map((_, index) => detectionKey(index)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("recycle.aiError"));
    } finally {
      setAnalyzing(false);
    }
  }

  const selectableDetections = useMemo(() => {
    const duplicateTotals = new Map<string, number>();
    for (const detection of result?.detections ?? []) {
      const duplicateKey = `${detection.itemType.toLowerCase()}-${detection.materialLabel.toLowerCase()}`;
      duplicateTotals.set(duplicateKey, (duplicateTotals.get(duplicateKey) ?? 0) + 1);
    }

    const duplicateCounts = new Map<string, number>();
    return (result?.detections ?? []).map((detection, index) => {
      const materialSlug = isMaterialSlug(detection.materialSlug) ? detection.materialSlug : null;
      const duplicateKey = `${detection.itemType.toLowerCase()}-${detection.materialLabel.toLowerCase()}`;
      const duplicateIndex = (duplicateCounts.get(duplicateKey) ?? 0) + 1;
      duplicateCounts.set(duplicateKey, duplicateIndex);
      const duplicateTotal = duplicateTotals.get(duplicateKey) ?? 1;
      const estimatedPoints = estimateDetectionPoints({ ...detection, materialSlug });
      return {
        ...detection,
        duplicateIndex,
        duplicateTotal,
        displayName: duplicateTotal > 1 ? `${detection.itemType} ${duplicateIndex}` : detection.itemType,
        key: detectionKey(index),
        materialSlug,
        estimatedPoints,
        pointRuleLabel: isPlasticBottleDetection({ ...detection, materialSlug }) ? t("recycle.ruleBottle") : t("recycle.ruleWeight"),
      };
    });
  }, [result, t]);

  const selectedDetectionKeySet = useMemo(() => new Set(selectedDetectionKeys), [selectedDetectionKeys]);
  const selectedDetections = selectableDetections.filter((detection) => selectedDetectionKeySet.has(detection.key));
  const selectedMaterialSlugs = [...new Set(selectedDetections.flatMap((detection) => detection.materialSlug ? [detection.materialSlug] : []))];
  const estimatedSelectedWeightKg = selectedDetections.reduce((total, detection) => total + detection.estimatedWeightKg, 0);
  const estimatedSelectedPoints = selectedDetections.reduce((total, detection) => total + detection.estimatedPoints, 0);
  const matchingCenters = selectedMaterialSlugs.length > 0
    ? PARTNER_CENTERS.filter((center) => {
      const centerMaterialSet = new Set(center.materials);
      return selectedMaterialSlugs.some((slug) => centerMaterialSet.has(slug));
    })
    : [];

  function submitSelectedRecyclables() {
    if (selectedDetections.length === 0) {
      setError(t("recycle.selectError"));
      return;
    }
    setError("");
    setSubmissionState("submitted");
    setFulfillmentOption(null);
  }

  function resetSubmission() {
    setSubmissionState("idle");
    setFulfillmentOption(null);
    setPickupPrepared(false);
  }

  function preparePickup() {
    setPickupForm((current) => ({
      ...current,
      date: t("recycle.routeLabel"),
      window: t("recycle.routeWindow"),
    }));
    setPickupPrepared(true);
    setFulfillmentOption("truck");
    setPickupDrawerOpen(false);
  }

  const submitted = submissionState === "submitted";
  const nextEcoLinkSchedule = {
    area: t("recycle.routeArea"),
    label: t("recycle.routeLabel"),
    window: t("recycle.routeWindow"),
  };

  return (
    <AppShell>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Intro */}
        <Box sx={{ mt: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase", letterSpacing: 0.4 }}
          >
            {t("recycle.kicker")}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.75, fontSize: { xs: "1.35rem", sm: "1.5rem" }, lineHeight: 1.25 }}>
            {t("recycle.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.55 }}>
            {t("recycle.subtitle")}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center" }}>
            <Box
              sx={{
                bgcolor: "rgba(8, 124, 120, 0.08)",
                color: "primary.main",
                px: 1.5,
                py: 0.5,
                borderRadius: "12px",
                fontSize: "0.7rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <Scale size={13} />
              {t("recycle.bottleRule")}
            </Box>
          </Stack>
        </Box>

        {submitted ? (
          /* Submission Results / Next Steps Panel */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: "rgba(8, 124, 120, 0.04)" }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <Avatar sx={{ bgcolor: "primary.main", color: "white", width: 34, height: 34 }}>
                    <CheckCircle2 size={18} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {t("recycle.submitted")}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.25 }}>
                      {t("recycle.nice")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {t("recycle.demoRequest")}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-around", textAlign: "center" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t("recycle.items")}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedDetections.length}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t("recycle.weight")}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{estimatedSelectedWeightKg.toFixed(2)} kg</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t("recycle.points")}</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "primary.main" }}>
                      ~{formatPoints(estimatedSelectedPoints)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* List of submitted items */}
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.default" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, fontWeight: 700 }}>
                {t("recycle.submittedItems")}
              </Typography>
              <Stack spacing={0.5}>
                {selectedDetections.map((d) => (
                  <Typography key={d.key} variant="caption" color="text.secondary" sx={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• {d.itemType}</span>
                    <span>{d.estimatedWeightKg.toFixed(2)} kg</span>
                  </Typography>
                ))}
              </Stack>
            </Paper>

            {/* Fulfillment Options */}
            <Stack spacing={1.5}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderColor: fulfillmentOption === "truck" ? "primary.main" : "divider",
                  borderWidth: fulfillmentOption === "truck" ? 2 : 1,
                  bgcolor: "background.paper",
                }}
              >
                <CardActionArea onClick={() => { setFulfillmentOption("truck"); setPickupDrawerOpen(true); }} sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.1)", color: "primary.main", width: 38, height: 38 }}>
                      <Truck size={20} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                        {t("recycle.scheduleTruck")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {t("recycle.scheduleHelp")}
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>

              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderColor: fulfillmentOption === "center" ? "primary.main" : "divider",
                  borderWidth: fulfillmentOption === "center" ? 2 : 1,
                  bgcolor: "background.paper",
                }}
              >
                <CardActionArea onClick={() => setFulfillmentOption("center")} sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Avatar sx={{ bgcolor: "rgba(11, 53, 88, 0.1)", color: "secondary.main", width: 38, height: 38 }}>
                      <Building2 size={20} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                        {t("recycle.nearbyCenter")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {t("recycle.nearbyHelp")}
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            </Stack>

            {pickupPrepared && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <strong>{t("recycle.pickupPrepared")}</strong>
                <Typography variant="caption" sx={{ display: "block" }}>
                  {`${nextEcoLinkSchedule.window} · ${nextEcoLinkSchedule.area}`}
                </Typography>
              </Alert>
            )}

            {fulfillmentOption === "center" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                    {matchingCenters.length > 0 ? t("recycle.matchingCenters", { count: matchingCenters.length }) : t("recycle.noMatches")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {matchingCenters.length > 0 ? t("recycle.matchesHelp") : t("recycle.noMatchesHelp")}
                  </Typography>
                </Box>

                <Stack spacing={1.5}>
                  {matchingCenters.map((center) => {
                    const acceptedSelectedMaterials = selectedMaterialSlugs.filter((slug) => center.materials.includes(slug));
                    return (
                      <Card key={center.id} variant="outlined" sx={{ borderRadius: 3, borderLeft: "4px solid", borderLeftColor: "primary.main" }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                            <MapPin size={18} color="#087c78" style={{ marginTop: 2 }} />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {center.township} · {center.hours}
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.25 }}>
                                {center.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                {center.address}
                              </Typography>

                              <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                                {acceptedSelectedMaterials.map((slug) => (
                                  <Chip key={slug} label={materialName(slug)} />
                                ))}
                              </Stack>

                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Navigation size={14} />}
                                href={`https://www.openstreetmap.org/directions?to=${center.latitude},${center.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                sx={{ mt: 2, minHeight: 38 }}
                              >
                                {t("recycle.startNavigation")}
                              </Button>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Button
              color="inherit"
              onClick={resetSubmission}
              startIcon={<RotateCcw size={16} />}
              variant="text"
              sx={{ alignSelf: "center", fontWeight: 700 }}
            >
              {t("recycle.editItems")}
            </Button>
          </Box>
        ) : (
          /* Analyzer Workspace / Upload Photo Page */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <CardActionArea
                onClick={() => setUploadOptionsOpen(true)}
                sx={{
                  minHeight: { xs: 220, sm: 200 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: previewUrl ? "black" : "rgba(0, 0, 0, 0.02)",
                  color: previewUrl ? "white" : "text.secondary",
                  border: "2px dashed",
                  borderColor: previewUrl ? "transparent" : "divider",
                  m: 1,
                  borderRadius: 2,
                  position: "relative",
                }}
              >
                {previewUrl ? (
                  <Box sx={{ width: "100%", height: { xs: 220, sm: 200 }, position: "relative" }}>
                    <Image
                      alt="Uploaded preview"
                      src={previewUrl}
                      fill
                      sizes="448px"
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  </Box>
                ) : (
                  <Stack spacing={1} sx={{ alignItems: "center", p: 3, textAlign: "center" }}>
                    <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.08)", color: "primary.main", width: 52, height: 52 }}>
                      <Camera size={24} />
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{t("recycle.tapPhoto")}</Typography>
                    <Typography variant="caption" color="text.secondary">{t("recycle.cameraGallery")}</Typography>
                  </Stack>
                )}
              </CardActionArea>

              <CardContent sx={{ p: 2, pt: 1.5 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {file ? t("recycle.photoReady") : t("recycle.startClear")}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 800,
                        color: "secondary.main",
                        wordBreak: "break-word",
                      }}
                    >
                      {file ? file.name : t("recycle.scanItem")}
                    </Typography>
                    {file && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        {t("recycle.selectedMb", { size: (file.size / 1024 / 1024).toFixed(2) })}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    disabled={!file || analyzing}
                    fullWidth
                    onClick={analyze}
                    size="large"
                    variant="contained"
                    startIcon={analyzing ? <CircularProgress size={18} color="inherit" /> : <Sparkles size={18} />}
                    sx={{
                      minHeight: 48,
                      fontWeight: 800,
                      borderRadius: 2,
                    }}
                  >
                    {analyzing ? t("recycle.analyzing") : t("recycle.analyzePhoto")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <input
              ref={cameraInputRef}
              style={{ display: "none" }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              style={{ display: "none" }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }} icon={<TriangleAlert size={18} />}>
                {error}
              </Alert>
            )}

            {result && (
              /* Detections List */
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ bgcolor: "rgba(45, 115, 80, 0.1)", color: "success.main", width: 28, height: 28 }}>
                          <CheckCircle2 size={16} />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{t("recycle.reviewDetected")}</Typography>
                          <Typography variant="caption" color="text.secondary">{t("recycle.confidence", { percent: Math.round(result.summary.confidence * 100) })}</Typography>
                        </Box>
                      </Box>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1,
                          bgcolor: "rgba(185, 120, 24, 0.08)",
                          color: "#b97818",
                          textAlign: "right",
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="caption" sx={{ display: "block", fontWeight: 700, lineHeight: 1 }}>{t("recycle.selected")}</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>~{formatPoints(estimatedSelectedPoints)} pts</Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.62rem", display: "block" }}>
                          {estimatedSelectedWeightKg.toFixed(2)} kg · {selectedDetections.length} items
                        </Typography>
                      </Paper>
                    </Stack>

                    {result.warnings.length > 0 && (
                      <Box sx={{ mt: 2, bgcolor: "rgba(180, 35, 24, 0.05)", p: 1, borderRadius: 2 }}>
                        {result.warnings.map((w) => (
                          <Typography key={w} variant="caption" color="error.main" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                            <TriangleAlert size={12} /> {w}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    <List sx={{ mt: 2, py: 0 }}>
                      {selectableDetections.length ? (
                        selectableDetections.map((detection) => {
                          const isChecked = selectedDetectionKeySet.has(detection.key);
                          return (
                            <ListItem
                              key={detection.key}
                              disablePadding
                              secondaryAction={
                                <Checkbox
                                  edge="end"
                                  checked={isChecked}
                                  sx={{ p: 1.25 }}
                                  onChange={(event) => {
                                    setSelectedDetectionKeys((current) => event.target.checked
                                      ? [...current, detection.key]
                                      : current.filter((key) => key !== detection.key));
                                  }}
                                />
                              }
                              sx={{
                                borderBottom: "1px solid",
                                borderColor: "divider",
                                py: 1.25,
                                minHeight: 56,
                              }}
                            >
                              <ListItemAvatar sx={{ minWidth: 46 }}>
                                <Avatar sx={{ width: 34, height: 34, fontSize: "0.75rem", bgcolor: "secondary.main" }}>
                                  {materialInitials(detection.materialLabel)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={detection.displayName}
                                slotProps={{
                                  primary: { variant: "body2", sx: { fontWeight: 800 } }
                                }}
                                secondary={
                                  <>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                      {detection.materialLabel} · {detection.pointRuleLabel}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                                      {detection.estimatedCount}× · {detection.estimatedWeightKg.toFixed(2)} kg · {detection.estimatedPoints > 0 ? `~${formatPoints(detection.estimatedPoints)} pts` : t("recycle.verificationRequired")}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                          );
                        })
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", py: 2 }}>
                          {t("recycle.noDetected")}
                        </Typography>
                      )}
                    </List>
                  </CardContent>
                </Card>

                <Button
                  disabled={selectedDetections.length === 0}
                  fullWidth
                  onClick={submitSelectedRecyclables}
                  size="large"
                  variant="contained"
                  sx={{ mt: 1, minHeight: 48, fontWeight: 800, borderRadius: 2 }}
                >
                  {t("recycle.submitSelected")}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Upload Options drawer */}
        <Drawer
          anchor="bottom"
          open={uploadOptionsOpen}
          onClose={() => setUploadOptionsOpen(false)}
          slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxWidth: 480, mx: "auto" } } }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t("recycle.uploadTitle")}</Typography>
                <Typography variant="caption" color="text.secondary">{t("recycle.uploadHelp")}</Typography>
              </Box>
              <IconButton onClick={() => setUploadOptionsOpen(false)}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider />
            <List>
              <ListItemButton onClick={() => { setUploadOptionsOpen(false); cameraInputRef.current?.click(); }} sx={{ py: 1.75, minHeight: 56, borderRadius: 2 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.08)", color: "primary.main" }}><Camera size={20} /></Avatar>
                </ListItemAvatar>
                <ListItemText primary={t("recycle.cameraShot")} secondary={t("recycle.cameraShotHelp")} slotProps={{ primary: { variant: "body2", sx: { fontWeight: 700 } } }} />
              </ListItemButton>
              <ListItemButton onClick={() => { setUploadOptionsOpen(false); galleryInputRef.current?.click(); }} sx={{ py: 1.75, minHeight: 56, borderRadius: 2, mt: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "rgba(11, 53, 88, 0.08)", color: "secondary.main" }}><ImagePlus size={20} /></Avatar>
                </ListItemAvatar>
                <ListItemText primary={t("recycle.gallery")} secondary={t("recycle.galleryHelp")} slotProps={{ primary: { variant: "body2", sx: { fontWeight: 700 } } }} />
              </ListItemButton>
            </List>
          </Box>
        </Drawer>

        {/* Pickup Scheduler drawer */}
        <Drawer
          anchor="bottom"
          open={pickupDrawerOpen}
          onClose={() => setPickupDrawerOpen(false)}
          slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxWidth: 480, mx: "auto" } } }}
        >
          <Box sx={{ p: 2 }} component="form" onSubmit={(e) => { e.preventDefault(); preparePickup(); }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t("recycle.confirmPickup")}</Typography>
                <Typography variant="caption" color="text.secondary">{t("recycle.pickupHelp")}</Typography>
              </Box>
              <IconButton onClick={() => setPickupDrawerOpen(false)}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2.5}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: "rgba(8, 124, 120, 0.05)", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{nextEcoLinkSchedule.label}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.5 }}>{nextEcoLinkSchedule.window}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{nextEcoLinkSchedule.area}</Typography>
              </Paper>

              <TextField
                required
                multiline
                rows={3}
                label={t("recycle.pickupAddress")}
                placeholder={t("recycle.pickupPlaceholder")}
                value={pickupForm.address}
                onChange={(e) => setPickupForm((current) => ({ ...current, address: e.target.value }))}
                variant="filled"
              />

              <TextField
                multiline
                rows={2}
                label={t("recycle.notes")}
                placeholder={t("recycle.notesPlaceholder")}
                value={pickupForm.notes}
                onChange={(e) => setPickupForm((current) => ({ ...current, notes: e.target.value }))}
                variant="filled"
              />

              <Button
                type="submit"
                variant="contained"
                startIcon={<CalendarClock size={16} />}
                fullWidth
                size="large"
              >
                {t("recycle.confirmSchedule")}
              </Button>
            </Stack>
          </Box>
        </Drawer>
      </Box>
    </AppShell>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: "8px",
        bgcolor: "rgba(0,0,0,0.05)",
        color: "text.secondary",
        fontSize: "0.62rem",
        fontWeight: 700,
      }}
    >
      {label}
    </Box>
  );
}
