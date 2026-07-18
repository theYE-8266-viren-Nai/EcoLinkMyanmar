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

const nextEcoLinkSchedule = {
  area: "Yangon partner route",
  label: "Next EcoLink pickup route",
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
      setError("Choose a clear photo before starting the analysis.");
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
        throw new Error("reason" in body ? body.reason : "error" in body ? body.error : "EcoGuide could not analyze this image.");
      }
      const scanResult = body as AiScanResponse;
      setResult(scanResult);
      setSelectedDetectionKeys(scanResult.detections.map((_, index) => detectionKey(index)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "EcoGuide could not analyze this image.");
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
        pointRuleLabel: isPlasticBottleDetection({ ...detection, materialSlug }) ? "1 point per bottle" : "Estimated by weight",
      };
    });
  }, [result]);

  const selectedDetections = selectableDetections.filter((detection) => selectedDetectionKeys.includes(detection.key));
  const selectedMaterialSlugs = [...new Set(selectedDetections.flatMap((detection) => detection.materialSlug ? [detection.materialSlug] : []))];
  const estimatedSelectedWeightKg = selectedDetections.reduce((total, detection) => total + detection.estimatedWeightKg, 0);
  const estimatedSelectedPoints = selectedDetections.reduce((total, detection) => total + detection.estimatedPoints, 0);
  const matchingCenters = selectedMaterialSlugs.length > 0
    ? PARTNER_CENTERS.filter((center) => selectedMaterialSlugs.some((slug) => center.materials.includes(slug)))
    : [];

  function submitSelectedRecyclables() {
    if (selectedDetections.length === 0) {
      setError("Select at least one recyclable item before submitting.");
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
      date: nextEcoLinkSchedule.label,
      window: nextEcoLinkSchedule.window,
    }));
    setPickupPrepared(true);
    setFulfillmentOption("truck");
    setPickupDrawerOpen(false);
  }

  const submitted = submissionState === "submitted";

  return (
    <AppShell>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Intro */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
            Recycle in Yangon
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
            Scan recyclables. Choose what happens next.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Use EcoGuide to identify recyclable items, submit what you plan to recycle, then schedule Eco pickup or head to a matching center.
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
              1 plastic bottle = 1 point
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
                      Selected recyclables submitted
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.25 }}>
                      Nice. Now choose how to recycle them.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      This is a demo request. A partner will verify the final weight and reward points.
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-around", textAlign: "center" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Items</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{selectedDetections.length}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Weight</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{estimatedSelectedWeightKg.toFixed(2)} kg</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Points</Typography>
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
                SUBMITTED ITEMS
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
                        Schedule Eco truck pickup
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        Confirm the next EcoLink route and add your pickup address.
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
                        Take to nearby recycle center
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                        See verified centers that accept your selected materials.
                      </Typography>
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            </Stack>

            {pickupPrepared && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <strong>Eco pickup request prepared.</strong>
                <Typography variant="caption" sx={{ display: "block" }}>
                  {`${nextEcoLinkSchedule.window} · ${nextEcoLinkSchedule.area}`}
                </Typography>
              </Alert>
            )}

            {fulfillmentOption === "center" && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                    {matchingCenters.length > 0 ? `${matchingCenters.length} matching centers` : "No verified matches"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {matchingCenters.length > 0 ? "These centers accept at least one selected material." : "Select items with known materials to find matches."}
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
                                Start Navigation
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
              Edit selected items
            </Button>
          </Box>
        ) : (
          /* Analyzer Workspace / Upload Photo Page */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
              <CardActionArea
                onClick={() => setUploadOptionsOpen(true)}
                sx={{
                  minHeight: 200,
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
                  <Box sx={{ width: "100%", height: 200, position: "relative" }}>
                    <Image
                      alt="Uploaded preview"
                      src={previewUrl}
                      fill
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  </Box>
                ) : (
                  <Stack spacing={1} sx={{ alignItems: "center", p: 3, textAlign: "center" }}>
                    <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.08)", color: "primary.main", width: 52, height: 52 }}>
                      <Camera size={24} />
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>Tap to add a photo</Typography>
                    <Typography variant="caption" color="text.secondary">Camera or gallery</Typography>
                  </Stack>
                )}
              </CardActionArea>

              <CardContent sx={{ p: 2, pt: 1 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {file ? "Photo ready" : "Start with one clear item"}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {file ? file.name : "Scan recyclable item"}
                    </Typography>
                    {file && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB selected
                      </Typography>
                    )}
                  </Box>
                  <Button
                    disabled={!file || analyzing}
                    onClick={analyze}
                    variant="contained"
                    startIcon={analyzing ? <CircularProgress size={16} color="inherit" /> : <Sparkles size={16} />}
                  >
                    {analyzing ? "Analyzing" : "Analyze photo"}
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
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Review detected items</Typography>
                          <Typography variant="caption" color="text.secondary">Confidence: {Math.round(result.summary.confidence * 100)}%</Typography>
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
                        <Typography variant="caption" sx={{ display: "block", fontWeight: 700, lineHeight: 1 }}>Selected</Typography>
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
                          const isChecked = selectedDetectionKeys.includes(detection.key);
                          return (
                            <ListItem
                              key={detection.key}
                              disablePadding
                              secondaryAction={
                                <Checkbox
                                  edge="end"
                                  checked={isChecked}
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
                                py: 1,
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
                                      {detection.estimatedCount}× · {detection.estimatedWeightKg.toFixed(2)} kg · {detection.estimatedPoints > 0 ? `~${formatPoints(detection.estimatedPoints)} pts` : "Verification required"}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                          );
                        })
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", py: 2 }}>
                          No recyclable items detected. Try another photo.
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
                  sx={{ mt: 1 }}
                >
                  Submit selected recyclables
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
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Upload item photo</Typography>
                <Typography variant="caption" color="text.secondary">Use a camera shot or select from gallery</Typography>
              </Box>
              <IconButton onClick={() => setUploadOptionsOpen(false)}>
                <X size={20} />
              </IconButton>
            </Stack>
            <Divider />
            <List>
              <ListItemButton onClick={() => { setUploadOptionsOpen(false); cameraInputRef.current?.click(); }} sx={{ py: 1.5, borderRadius: 2 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.08)", color: "primary.main" }}><Camera size={20} /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Camera shot" secondary="Take a new photo with camera" slotProps={{ primary: { variant: "body2", sx: { fontWeight: 700 } } }} />
              </ListItemButton>
              <ListItemButton onClick={() => { setUploadOptionsOpen(false); galleryInputRef.current?.click(); }} sx={{ py: 1.5, borderRadius: 2, mt: 1 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "rgba(11, 53, 88, 0.08)", color: "secondary.main" }}><ImagePlus size={20} /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Pick from gallery" secondary="Choose an existing image" slotProps={{ primary: { variant: "body2", sx: { fontWeight: 700 } } }} />
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
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Confirm Eco truck pickup</Typography>
                <Typography variant="caption" color="text.secondary">EcoLink will place this demo request on the next route</Typography>
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
                label="Pickup address"
                placeholder="Street, township, landmark"
                value={pickupForm.address}
                onChange={(e) => setPickupForm((current) => ({ ...current, address: e.target.value }))}
                variant="filled"
              />

              <TextField
                multiline
                rows={2}
                label="Notes (optional)"
                placeholder="Gate instructions, bag count, contact notes"
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
                Confirm next EcoLink schedule
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
