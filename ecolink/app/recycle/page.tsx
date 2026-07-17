"use client";

import { Camera, CheckCircle2, ImagePlus, LoaderCircle, LocateFixed, MapPin, Navigation, Search, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import { MATERIALS, PARTNER_CENTERS, type MaterialSlug } from "@/lib/ecolink-data";
import type { AiScanResponse } from "@/schemas/ai-scan";

const SAMPLE_RESULTS: Record<string, AiScanResponse> = {
  bottle: { summary: { primaryMaterialLabel: "PET plastic", primaryMaterialSlug: "pet-plastic", estimatedBottleCount: 1, estimatedTotalWeightKg: 0.03, confidence: 0.96 }, detections: [{ materialLabel: "PET plastic", materialSlug: "pet-plastic", itemType: "clean drinks bottle", estimatedCount: 1, estimatedWeightKg: 0.03, confidence: 0.96, reasoning: "The clear bottle body and PET form are visible." }], warnings: [] },
  box: { summary: { primaryMaterialLabel: "Paper and cardboard", primaryMaterialSlug: "paper-cardboard", estimatedBottleCount: 0, estimatedTotalWeightKg: 0.2, confidence: 0.82 }, detections: [{ materialLabel: "Paper and cardboard", materialSlug: "paper-cardboard", itemType: "food box", estimatedCount: 1, estimatedWeightKg: 0.2, confidence: 0.82, reasoning: "The box is cardboard, but visible grease can prevent recycling." }], warnings: ["Food residue may make this item unsuitable. Remove clean sections only."] },
  battery: { summary: { primaryMaterialLabel: "Battery", primaryMaterialSlug: "batteries", estimatedBottleCount: 0, estimatedTotalWeightKg: 0.04, confidence: 0.98 }, detections: [{ materialLabel: "Battery", materialSlug: "batteries", itemType: "household battery", estimatedCount: 1, estimatedWeightKg: 0.04, confidence: 0.98, reasoning: "A cylindrical household battery is clearly visible." }], warnings: ["Do not place batteries in household recycling. Use a specialist collection point."] },
};

export default function RecyclePage() {
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<MaterialSlug | "all">("all");
  const [selectedCenterId, setSelectedCenterId] = useState<string>(PARTNER_CENTERS[0].id);
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<AiScanResponse>();
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const selectedCenter = PARTNER_CENTERS.find((center) => center.id === selectedCenterId) ?? PARTNER_CENTERS[0];
  const filteredCenters = useMemo(() => PARTNER_CENTERS.filter((center) => {
    const matchesQuery = `${center.name} ${center.township}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (materialFilter === "all" || center.materials.includes(materialFilter));
  }), [query, materialFilter]);

  async function analyze() {
    if (!file) { setError("Choose a clear photo before starting the analysis."); return; }
    setAnalyzing(true); setError(""); setResult(undefined);
    try {
      const formData = new FormData(); formData.append("image", file);
      const response = await fetch("/api/ai/scans", { method: "POST", body: formData });
      const body = await response.json() as AiScanResponse | { error?: string; reason?: string };
      if (!response.ok) throw new Error("reason" in body ? body.reason : "error" in body ? body.error : "EcoGuide could not analyze this image.");
      setResult(body as AiScanResponse);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "EcoGuide could not analyze this image."); }
    finally { setAnalyzing(false); }
  }

  const resultSlug = result?.summary.primaryMaterialSlug;
  const matchingCenters = resultSlug ? PARTNER_CENTERS.filter((center) => center.materials.includes(resultSlug as MaterialSlug)) : [];

  return (
    <AppShell>
      <main className="content-container recycle-page">
        <header className="page-intro"><div><p>Recycle in Yangon</p><h1>Find where it belongs</h1><span>Browse every center freely, or scan an item only when you need help.</span></div><span className="network-badge"><MapPin size={17}/> Yangon network</span></header>

        <section className="analyzer-section" id="analyzer" aria-labelledby="analyzer-title">
          <div className="analyzer-copy"><span className="feature-label"><Sparkles size={16}/> Optional AI assistance</span><h2 id="analyzer-title">Not sure about an item?</h2><p>Take one clear photo. EcoGuide checks the item; verified center rules decide where it can go.</p><small>Your photo is sent only after you tap Analyze. Sample checks do not use AI.</small></div>
          <div className="analyzer-workspace">
            <div className="photo-actions">
              <label className="upload-button"><Camera size={19}/><span><strong>Take a photo</strong><small>Open the camera</small></span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setFile(event.target.files?.[0])}/></label>
              <label className="upload-button"><ImagePlus size={19}/><span><strong>Choose a photo</strong><small>Pick from your device</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0])}/></label>
            </div>
            {file ? <div className="selected-file"><CheckCircle2 size={18}/><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button className="button button--primary" type="button" disabled={analyzing} onClick={analyze}>{analyzing ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {analyzing ? "Analyzing" : "Analyze item"}</button></div> : <p className="photo-tip">Show one item close up, in clear light.</p>}
            <div className="sample-row"><span>Try a sample</span><button type="button" onClick={() => { setResult(SAMPLE_RESULTS.bottle); setError(""); }}>Clean bottle</button><button type="button" onClick={() => { setResult(SAMPLE_RESULTS.box); setError(""); }}>Greasy box</button><button type="button" onClick={() => { setResult(SAMPLE_RESULTS.battery); setError(""); }}>Battery</button></div>
            {error ? <div className="inline-message inline-message--error" role="alert"><TriangleAlert size={18}/><span><strong>Analysis unavailable</strong>{error}</span></div> : null}
            {result ? <div className="analysis-result" role="status"><div><span className="result-icon"><CheckCircle2 size={22}/></span><div><small>EcoGuide result</small><h3>{result.summary.primaryMaterialLabel ?? "Item unclear"}</h3><p>{result.detections[0]?.reasoning ?? "Try another photo with the item closer to the camera."}</p></div><strong>{Math.round(result.summary.confidence * 100)}%</strong></div>{result.warnings.map((warning) => <p className="result-warning" key={warning}><TriangleAlert size={15}/>{warning}</p>)}<div className="result-centers"><span>{matchingCenters.length > 0 ? `${matchingCenters.length} partner centers accept this material` : "No verified center match yet"}</span>{matchingCenters.slice(0, 3).map((center) => <button type="button" key={center.id} onClick={() => setSelectedCenterId(center.id)}>{center.name}</button>)}</div></div> : null}
          </div>
        </section>

        <section className="center-map-section" aria-labelledby="center-map-title">
          <div className="map-toolbar"><div><p>Map landmarks</p><h2 id="center-map-title">Partner centers</h2></div><span>{filteredCenters.length} centers</span></div>
          <div className="map-layout">
            <aside className="center-sidebar">
              <label className="search-field"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search centers" aria-label="Search centers"/></label>
              <label className="filter-field"><span>Accepts</span><select value={materialFilter} onChange={(event) => setMaterialFilter(event.target.value as MaterialSlug | "all")}><option value="all">All materials</option>{MATERIALS.map((material) => <option value={material.slug} key={material.slug}>{material.name}</option>)}</select></label>
              <div className="center-list">{filteredCenters.map((center) => <button type="button" className={center.id === selectedCenter.id ? "center-list-item is-selected" : "center-list-item"} onClick={() => setSelectedCenterId(center.id)} key={center.id}><span><strong>{center.name}</strong><small>{center.township}</small></span><p>{center.materials.slice(0, 3).map((slug) => MATERIALS.find((material) => material.slug === slug)?.name).join(" / ")}</p></button>)}</div>
            </aside>
            <div className="map-canvas">
              <iframe title="OpenStreetMap showing central Yangon" src="https://www.openstreetmap.org/export/embed.html?bbox=96.075%2C16.745%2C96.205%2C16.91&amp;layer=mapnik" loading="lazy"/>
              <button className="location-button" type="button" onClick={() => navigator.geolocation?.getCurrentPosition(() => undefined)}><LocateFixed size={17}/> Use my location</button>
            </div>
          </div>
          <article className="center-detail"><div><span className="center-detail__pin"><MapPin size={20}/></span><div><small>Partner center</small><h3>{selectedCenter.name}</h3><p>{selectedCenter.township} &middot; {selectedCenter.hours}</p><span>{selectedCenter.address}</span></div></div><div className="center-detail__materials">{selectedCenter.materials.map((slug) => <span key={slug}>{MATERIALS.find((material) => material.slug === slug)?.name}</span>)}</div><a className="button button--primary" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?to=${selectedCenter.latitude},${selectedCenter.longitude}`}><Navigation size={17}/> Start navigation</a></article>
        </section>
      </main>
    </AppShell>
  );
}
