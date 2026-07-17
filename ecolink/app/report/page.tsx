"use client";

import { Check, ChevronLeft, ChevronRight, Flame, LocateFixed, MapPin, ShieldAlert, Trash2, Waves } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import { useEcoLink } from "@/providers/ecolink-context";

const ISSUES = [
  { id: "plastic-dump", title: "Plastic dump", description: "Accumulated bags, bottles or packaging", Icon: Trash2 },
  { id: "blocked-drain", title: "Blocked drain", description: "Waste obstructing water flow", Icon: Waves },
  { id: "water-pollution", title: "Water pollution", description: "Visible dumping or unusual water colour", Icon: Waves },
  { id: "illegal-burning", title: "Illegal burning", description: "Open burning of waste or plastic", Icon: Flame },
  { id: "chemical-spill", title: "Chemical spill", description: "Unknown liquid, fumes or hazardous material", Icon: ShieldAlert },
] as const;

const SEVERITIES = [
  { id: "limited", title: "Limited", description: "Small and contained; no immediate danger." },
  { id: "concerning", title: "Concerning", description: "Growing or affecting a shared public area." },
  { id: "urgent", title: "Urgent", description: "Spreading quickly or potentially dangerous." },
] as const;

export default function ReportPage() {
  const { addReport } = useEcoLink();
  const [step, setStep] = useState(1);
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function continueFlow() {
    if (step === 1 && (!issueType || !severity)) { setError("Choose an issue type and seriousness level to continue."); return; }
    if (step === 2 && location.trim().length < 4) { setError("Add a nearby landmark or use your current location."); return; }
    setError(""); setStep((current) => Math.min(3, current + 1));
  }

  function useLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setError("Location services are not available in this browser."); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`); setError(""); },
      () => setError("We could not read your location. Enter a nearby landmark instead."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function submitReport() {
    addReport({ issueType, severity, location: location.trim(), notes: notes.trim() });
    setSubmitted(true);
  }

  if (submitted) return <AppShell><main className="content-container report-page"><section className="report-success"><span><Check size={34}/></span><p>Report received</p><h1>Thank you for helping your community.</h1><span>Your report is in the review queue. EcoLink will group nearby reports before sharing them with response partners.</span><button className="button button--primary" type="button" onClick={() => { setSubmitted(false); setStep(1); setIssueType(""); setSeverity(""); setLocation(""); setNotes(""); }}>Create another report</button></section></main></AppShell>;

  return (
    <AppShell>
      <main className="content-container report-page">
        <header className="report-intro"><p>Community action</p><h1>Report an environmental issue</h1><span>Clear choices and location grouping keep reports useful without additional AI calls.</span></header>
        <ol className="stepper" aria-label="Report progress">{["Issue", "Location", "Review"].map((label, index) => <li className={step >= index + 1 ? "is-active" : ""} key={label}><span>{step > index + 1 ? <Check size={15}/> : index + 1}</span><strong>{label}</strong></li>)}</ol>
        <section className="report-workspace">
          <div className="report-step-heading"><span>Step {step} of 3</span><h2>{step === 1 ? "What is happening?" : step === 2 ? "Where is the issue?" : "Review your report"}</h2><p>{step === 1 ? "Choose the closest match. The descriptions help people report consistently." : step === 2 ? "A precise landmark helps response teams group nearby reports." : "Check the details before adding this report to the community queue."}</p></div>
          {step === 1 ? <><div className="issue-grid">{ISSUES.map(({ id, title, description, Icon }) => <button className={issueType === id ? "issue-option is-selected" : "issue-option"} type="button" onClick={() => setIssueType(id)} key={id}><Icon size={21}/><span><strong>{title}</strong><small>{description}</small></span>{issueType === id ? <Check size={18}/> : null}</button>)}</div><fieldset className="severity-field"><legend>How serious is it?</legend>{SEVERITIES.map((item) => <label className={severity === item.id ? "severity-option is-selected" : "severity-option"} key={item.id}><input type="radio" name="severity" value={item.id} checked={severity === item.id} onChange={() => setSeverity(item.id)}/><span><strong>{item.title}</strong><small>{item.description}</small></span></label>)}</fieldset></> : null}
          {step === 2 ? <div className="location-step"><div className="location-map"><iframe title="OpenStreetMap for report location" src="https://www.openstreetmap.org/export/embed.html?bbox=96.075%2C16.745%2C96.205%2C16.91&amp;layer=mapnik" loading="lazy" sandbox="allow-scripts allow-popups"/></div><label><span>Nearby landmark or coordinates</span><div className="input-with-icon"><MapPin size={18}/><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Example: Hledan Market, Insein Road"/></div></label><button className="button button--secondary" type="button" onClick={useLocation}><LocateFixed size={17}/> Use my current location</button><label><span>Additional details <small>(optional)</small></span><textarea value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="Describe what you can see and any immediate risks."/><small>{notes.length}/500</small></label></div> : null}
          {step === 3 ? <div className="report-review"><div><span>Issue</span><strong>{ISSUES.find((item) => item.id === issueType)?.title}</strong></div><div><span>Seriousness</span><strong>{SEVERITIES.find((item) => item.id === severity)?.title}</strong></div><div><span>Location</span><strong>{location}</strong></div><div><span>Details</span><strong>{notes || "No additional details"}</strong></div><p><ShieldAlert size={18}/>Do not approach hazardous waste or active fires. Contact emergency services when anyone is in immediate danger.</p></div> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="report-actions">{step > 1 ? <button className="button button--secondary" type="button" onClick={() => { setError(""); setStep((current) => current - 1); }}><ChevronLeft size={17}/> Back</button> : <span/>}{step < 3 ? <button className="button button--primary" type="button" onClick={continueFlow}>Continue <ChevronRight size={17}/></button> : <button className="button button--primary" type="button" onClick={submitReport}>Send report <Check size={17}/></button>}</div>
        </section>
      </main>
    </AppShell>
  );
}
