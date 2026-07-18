"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, Leaf, Play, RefreshCcw, Send, ThumbsDown, ThumbsUp, WifiOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { FaqAssistantClientResponse, FaqVideoCard } from "@/features/faq-assistant/schemas/faq-assistant";
import type { FaqAssistantMessage } from "@/features/faq-assistant/types/faq-assistant";

const STARTERS = [
  "How should I prepare plastic bottles before recycling?",
  "Where should batteries and e-waste go?",
  "How do points work after a report is approved?",
  "How do I report a waste issue to EcoLink?",
];

async function sendFeedback(messageId: string, value: "useful" | "not_useful") {
  await fetch("/api/faq-assistant/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, value }),
  }).catch(() => undefined);
}

function ChecklistIcon({ status }: { status: "recommended" | "warning" | "important" }) {
  if (status === "recommended") return <CheckCircle2 aria-hidden="true" size={17} />;
  if (status === "important") return <CircleAlert aria-hidden="true" size={17} />;
  return <AlertTriangle aria-hidden="true" size={17} />;
}

function VideoCard({ video }: { video: FaqVideoCard }) {
  const [error, setError] = useState("");

  return (
    <button
      aria-label={`Open ${video.title} on YouTube`}
      className="faq-video-card"
      type="button"
      onClick={() => {
        const opened = window.open(video.youtubeUrl, "_blank", "noopener,noreferrer");
        if (!opened) setError("The YouTube link could not open. Check your browser pop-up settings.");
      }}
    >
      <span className="faq-video-thumb">
        <Image alt="" fill sizes="112px" src={video.thumbnailUrl} />
        <i><Play fill="currentColor" size={18} /></i>
      </span>
      <span className="faq-video-copy">
        <strong>{video.title}</strong>
        <small>{video.channelName} - YouTube</small>
        {error ? <em>{error}</em> : null}
      </span>
    </button>
  );
}

function AnswerCard({
  message,
  onFeedback,
}: {
  message: FaqAssistantMessage;
  onFeedback: (messageId: string, value: "useful" | "not_useful") => void;
}) {
  const response = message.response;
  if (!response) return null;

  return (
    <article className="faq-answer-card">
      <div className="faq-answer-title"><Leaf aria-hidden="true" size={18} /><h2>{response.title}</h2></div>
      <p>{response.answer}</p>

      {response.checklist.length > 0 ? (
        <section>
          <h3>Checklist</h3>
          <ul className="faq-checklist">
            {response.checklist.map((item) => (
              <li className={`is-${item.status}`} key={item.text}><ChecklistIcon status={item.status} /><span>{item.text}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {response.questionsToAsk.length > 0 ? (
        <section><h3>Questions to ask</h3><ul>{response.questionsToAsk.map((item) => <li key={item}>{item}</li>)}</ul></section>
      ) : null}

      {response.warnings.length > 0 ? (
        <section><h3>Warnings</h3><ul className="faq-warnings">{response.warnings.map((item) => <li key={item}>{item}</li>)}</ul></section>
      ) : null}

      {response.videos.length > 0 ? (
        <section><h3>Related learning</h3><div className="faq-video-list">{response.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>
      ) : null}

      {response.confidence === "low" || response.needsHumanHelp ? (
        <p className="faq-confidence">EcoGuide is not fully confident. Confirm with a partner center or the EcoLink team before acting.</p>
      ) : null}

      <div className="faq-feedback" aria-label="Assistant answer feedback">
        <button type="button" onClick={() => onFeedback(message.id, "useful")}><ThumbsUp size={15} />Useful</button>
        <button type="button" onClick={() => onFeedback(message.id, "not_useful")}><ThumbsDown size={15} />Not useful</button>
      </div>
    </article>
  );
}

export function FaqAssistantScreen({ mode = "page" }: { mode?: "page" | "panel" }) {
  const [messages, setMessages] = useState<FaqAssistantMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const latestRef = useRef<HTMLDivElement>(null);
  const inputId = mode === "panel" ? "faq-question-panel" : "faq-question";

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => latestRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, loading]);

  async function send(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;
    if (offline) {
      setError("You appear to be offline. Reconnect before asking EcoGuide.");
      return;
    }

    setError("");
    setQuestion("");
    setLoading(true);
    const localUserMessage: FaqAssistantMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((current) => [...current, localUserMessage]);

    try {
      const response = await fetch("/api/faq-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = await response.json() as { error?: string; messageId?: string; response?: FaqAssistantClientResponse };
      if (!response.ok || !payload.response || !payload.messageId) throw new Error(payload.error ?? "Assistant unavailable");
      const assistantResponse = payload.response;
      const assistantMessageId = payload.messageId;
      setMessages((current) => [...current, { id: assistantMessageId, role: "assistant", content: assistantResponse.answer, response: assistantResponse }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "EcoGuide is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={mode === "panel" ? "faq-page faq-page--panel" : "content-container faq-page"}>
      <header className="faq-header">
        <div><span><Leaf size={16} /> EcoGuide</span><h1>EcoLink FAQ assistant</h1><p>Ask about recycling, drop-offs, report approvals, points, rewards, and safe material handling.</p></div>
        <strong className={offline ? "is-offline" : ""}>{offline ? <WifiOff size={15} /> : <span />} {offline ? "Offline" : "Online"}</strong>
      </header>

      <section className="faq-chat-shell" aria-label="EcoGuide chat">
        <div className="faq-message-list">
          {messages.length === 0 ? (
            <div className="faq-empty">
              <Leaf size={30} />
              <h2>Not sure where something belongs?</h2>
              <div>{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => send(starter)}>{starter}</button>)}</div>
            </div>
          ) : messages.map((message) => (
            <div className={`faq-message is-${message.role}`} key={message.id}>
              {message.role === "user" ? <p>{message.content}</p> : <AnswerCard message={message} onFeedback={sendFeedback} />}
            </div>
          ))}
          {loading ? <div className="faq-loading"><RefreshCcw size={16} />EcoGuide is checking guidance...</div> : null}
          {error ? <div className="faq-error"><span>{error}</span><button type="button" onClick={() => send(messages.filter((item) => item.role === "user").at(-1)?.content ?? "")}>Retry</button></div> : null}
          <div ref={latestRef} />
        </div>

        <form className="faq-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <label className="sr-only" htmlFor={inputId}>Ask EcoGuide</label>
          <textarea id={inputId} value={question} maxLength={700} placeholder="Example: should I remove the cap from a plastic bottle?" onChange={(event) => setQuestion(event.target.value)} />
          <button aria-label="Send question" type="submit" disabled={loading || !question.trim()}><Send size={18} /></button>
        </form>
      </section>
    </section>
  );
}
