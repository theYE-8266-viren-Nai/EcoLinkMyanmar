"use client";

import Image from "next/image";
import {
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
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
import { useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
      <main className="content-container recycle-page">
        <header className="page-intro">
          <div>
            <p>Recycle in Yangon</p>
            <h1>Scan recyclables. Choose what happens next.</h1>
            <span>Use EcoGuide to identify recyclable items, submit what you plan to recycle, then schedule Eco pickup or head to a matching center.</span>
          </div>
          <span className="network-badge"><Scale size={17}/> 1 plastic bottle = 1 point</span>
        </header>

        <section className="analyzer-section recycle-flow-section" id="analyzer" aria-label="Recycle submission flow">
          {submitted ? (
            <div className="submission-panel" role="status">
              <div className="submission-hero">
                <span className="result-icon"><CheckCircle2 size={24}/></span>
                <div>
                  <small>Selected recyclables submitted</small>
                  <h2>Nice. Now choose how to recycle them.</h2>
                  <p>This is a demo request. A partner will verify the final weight and reward points.</p>
                </div>
              </div>

              <div className="submitted-summary" aria-label="Submitted recyclable summary">
                <div>
                  <span>Items</span>
                  <strong>{selectedDetections.length}</strong>
                </div>
                <div>
                  <span>Estimated weight</span>
                  <strong>{estimatedSelectedWeightKg.toFixed(2)} kg</strong>
                </div>
                <div>
                  <span>Estimated points</span>
                  <strong>~{formatPoints(estimatedSelectedPoints)}</strong>
                </div>
              </div>

              <div className="submitted-items">
                {selectedDetections.map((detection) => (
                  <span key={detection.key}>{detection.itemType} · {detection.estimatedWeightKg.toFixed(2)} kg</span>
                ))}
              </div>

              <div className="fulfillment-grid" aria-label="Choose recycling method">
                <button
                  className={fulfillmentOption === "truck" ? "fulfillment-card is-selected" : "fulfillment-card"}
                  type="button"
                  onClick={() => {
                    setFulfillmentOption("truck");
                    setPickupDrawerOpen(true);
                  }}
                >
                  <span><Truck size={24}/></span>
                  <strong>Schedule Eco truck pickup</strong>
                  <small>Confirm the next EcoLink route and add your pickup address.</small>
                </button>
                <button
                  className={fulfillmentOption === "center" ? "fulfillment-card is-selected" : "fulfillment-card"}
                  type="button"
                  onClick={() => setFulfillmentOption("center")}
                >
                  <span><Building2 size={24}/></span>
                  <strong>Take to nearby recycle center</strong>
                  <small>See verified centers that accept your selected materials.</small>
                </button>
              </div>

              {pickupPrepared ? (
                <div className="inline-message inline-message--success" role="status">
                  <CheckCircle2 size={18}/>
                  <span>
                    <strong>Eco pickup request prepared.</strong>
                    {`${nextEcoLinkSchedule.window} · ${nextEcoLinkSchedule.area}`}
                  </span>
                </div>
              ) : null}

              {fulfillmentOption === "center" ? (
                <div className="matching-centers" aria-live="polite">
                  <div className="matching-centers__header">
                    <span>{matchingCenters.length > 0 ? `${matchingCenters.length} matching centers` : "No verified match yet"}</span>
                    <p>{matchingCenters.length > 0 ? "These centers accept at least one selected material." : "Select recyclable items with known materials to find a nearby center."}</p>
                  </div>
                  {matchingCenters.length > 0 ? matchingCenters.map((center) => {
                    const acceptedSelectedMaterials = selectedMaterialSlugs.filter((slug) => center.materials.includes(slug));
                    return (
                      <article className="center-option-card" key={center.id}>
                        <div>
                          <span className="center-detail__pin"><MapPin size={18}/></span>
                          <div>
                            <small>{center.township} · {center.hours}</small>
                            <h3>{center.name}</h3>
                            <p>{center.address}</p>
                          </div>
                        </div>
                        <div className="center-detail__materials">
                          {acceptedSelectedMaterials.map((slug) => <span key={slug}>{materialName(slug)}</span>)}
                        </div>
                        <a className="button button--primary" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?to=${center.latitude},${center.longitude}`}>
                          <Navigation size={17}/> Start navigation
                        </a>
                      </article>
                    );
                  }) : null}
                </div>
              ) : null}

              <button className="button button--secondary restart-button" type="button" onClick={resetSubmission}>
                <RotateCcw size={17}/> Edit selected items
              </button>
            </div>
          ) : (
            <div className="analyzer-workspace">
              <div className={result ? "scan-card has-result" : "scan-card"}>
                <button
                  aria-label={file ? "Change selected recyclable item photo" : "Upload recyclable item photo"}
                  className={previewUrl ? "scan-photo has-photo" : "scan-photo"}
                  type="button"
                  onClick={() => setUploadOptionsOpen(true)}
                >
                  {previewUrl ? <Image alt="Selected recyclable item preview" src={previewUrl} fill sizes="(max-width: 760px) calc(100vw - 64px), 52vw" unoptimized /> : <><span><Camera size={28}/></span><strong>Tap to add a photo</strong><small>Camera or gallery</small></>}
                </button>
                <div className="scan-card__body">
                  <div>
                    <span>{file ? "Photo ready" : "Start with one clear item"}</span>
                    <strong>{file ? file.name : "Scan recyclable item"}</strong>
                    <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : "Use daylight, fill the frame, avoid mixed piles."}</small>
                  </div>
                  <button className="button button--primary" type="button" disabled={!file || analyzing} onClick={analyze}>
                    {analyzing ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>}
                    {analyzing ? "Analyzing" : file ? "Analyze photo" : "Choose photo first"}
                  </button>
                </div>
              </div>
              <input ref={cameraInputRef} className="file-input-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0])}/>
              <input ref={galleryInputRef} className="file-input-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])}/>
              {error ? <div className="inline-message inline-message--error" role="alert"><TriangleAlert size={18}/><span><strong>Analysis unavailable</strong>{error}</span></div> : null}
              {result ? (
                <div className="analysis-result" role="status">
                  <div><span className="result-icon"><CheckCircle2 size={22}/></span><div><small>EcoGuide result</small><h3>Review detected items</h3><p>Use the checkboxes to include items. Partner centers verify final material and weight.</p></div><strong>{Math.round(result.summary.confidence * 100)}%</strong></div>
                  <div className="recycle-estimate recycle-estimate--sticky">
                    <span>Selected</span>
                    <strong>~{formatPoints(estimatedSelectedPoints)} pts</strong>
                    <small>{estimatedSelectedWeightKg.toFixed(2)} kg · {selectedDetections.length} item{selectedDetections.length === 1 ? "" : "s"}</small>
                  </div>
                  {result.warnings.length > 0 ? (
                    <div className="scan-warning-panel" aria-label="Scan confidence notes">
                      {result.warnings.map((warning) => <p key={warning}><TriangleAlert size={15}/>{warning}</p>)}
                    </div>
                  ) : null}
                  <div className="recyclable-list" aria-label="Detected recyclable items">
                    {selectableDetections.length ? selectableDetections.map((detection) => (
                      <label className="recyclable-item" key={detection.key}>
                        <input
                          checked={selectedDetectionKeys.includes(detection.key)}
                          onChange={(event) => {
                            setSelectedDetectionKeys((current) => event.target.checked
                              ? [...current, detection.key]
                              : current.filter((key) => key !== detection.key));
                          }}
                          type="checkbox"
                        />
                        <span className="recyclable-thumb" aria-hidden="true">{materialInitials(detection.materialLabel)}</span>
                        <span className="recyclable-copy">
                          <strong>{detection.displayName}</strong>
                          <small>{detection.materialLabel} · {detection.pointRuleLabel}</small>
                        </span>
                        <b>
                          <span>{detection.estimatedCount}× · {detection.estimatedWeightKg.toFixed(2)} kg</span>
                          {detection.estimatedPoints > 0 ? `~${formatPoints(detection.estimatedPoints)} pts` : "Center check"}
                        </b>
                        <em>{selectedDetectionKeys.includes(detection.key) ? "Included" : "Not included"}</em>
                      </label>
                    )) : <p className="photo-tip">No recyclable items were detected. Try another photo with the item closer to the camera.</p>}
                  </div>
                  <button className="button button--primary submit-recyclables-button" type="button" disabled={selectedDetections.length === 0} onClick={submitSelectedRecyclables}>
                    Submit selected recyclables
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <Drawer open={uploadOptionsOpen} onOpenChange={setUploadOptionsOpen} showSwipeHandle>
          <DrawerContent className="upload-options-drawer">
            <DrawerHeader>
              <DrawerTitle>Upload item photo</DrawerTitle>
              <DrawerDescription>Use a new camera shot or pick a photo from your gallery.</DrawerDescription>
            </DrawerHeader>
            <div className="upload-options">
              <button type="button" onClick={() => cameraInputRef.current?.click()}><Camera size={22}/><span><strong>Camera shot</strong><small>Take a new photo</small></span></button>
              <button type="button" onClick={() => galleryInputRef.current?.click()}><ImagePlus size={22}/><span><strong>Pick from gallery</strong><small>Use an existing photo</small></span></button>
              <button className="upload-options__cancel" type="button" onClick={() => setUploadOptionsOpen(false)}><X size={18}/>Cancel</button>
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={pickupDrawerOpen} onOpenChange={setPickupDrawerOpen} showSwipeHandle>
          <DrawerContent className="pickup-scheduler-drawer">
            <DrawerHeader>
              <DrawerTitle>Confirm Eco truck pickup</DrawerTitle>
              <DrawerDescription>EcoLink will place this demo request on the next available route.</DrawerDescription>
            </DrawerHeader>
            <form className="pickup-form" onSubmit={(event) => { event.preventDefault(); preparePickup(); }}>
              <div className="next-schedule-card" aria-label="Next EcoLink pickup schedule">
                <span>{nextEcoLinkSchedule.label}</span>
                <strong>{nextEcoLinkSchedule.window}</strong>
                <small>{nextEcoLinkSchedule.area}</small>
              </div>
              <label>
                <span>Pickup address</span>
                <textarea required value={pickupForm.address} placeholder="Street, township, landmark" onChange={(event) => setPickupForm((current) => ({ ...current, address: event.target.value }))}/>
              </label>
              <label>
                <span>Notes <small>optional</small></span>
                <textarea value={pickupForm.notes} placeholder="Gate instructions, bag count, contact notes" onChange={(event) => setPickupForm((current) => ({ ...current, notes: event.target.value }))}/>
              </label>
              <button className="button button--primary" type="submit">
                <CalendarClock size={17}/> Confirm next EcoLink schedule
              </button>
            </form>
          </DrawerContent>
        </Drawer>
      </main>
    </AppShell>
  );
}
