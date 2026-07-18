"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, Leaf, Play, RefreshCcw, Send, ThumbsDown, ThumbsUp, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { FaqAssistantClientResponse, FaqVideoCard } from "@/features/faq-assistant/schemas/faq-assistant";
import type { FaqAssistantMessage } from "@/features/faq-assistant/types/faq-assistant";

const STARTERS = [
  "Plastic bottle တွေ recycle မလုပ်ခင် ဘာလုပ်ရမလဲ?",
  "Battery နဲ့ e-waste ကို ဘယ်လိုစွန့်ပစ်သင့်လဲ?",
  "Drop-off လုပ်ရင် points ဘယ်လိုရလဲ?",
  "အမှိုက်ပုံတွေ့ရင် EcoLink မှာ report ဘယ်လိုလုပ်ရမလဲ?",
];

function ChecklistIcon({ status }: { status: "recommended" | "warning" | "important" }) {
  if (status === "recommended") return <CheckCircle2 aria-hidden="true" size={17} />;
  if (status === "important") return <CircleAlert aria-hidden="true" size={17} />;
  return <AlertTriangle aria-hidden="true" size={17} />;
}

function VideoCard({ video }: { video: FaqVideoCard }) {
  const [error, setError] = useState("");
  return (
    <button
      aria-label={`${video.title} ကို YouTube တွင်ဖွင့်ရန်`}
      className="faq-video-card"
      type="button"
      onClick={() => {
        const opened = window.open(video.youtubeUrl, "_blank", "noopener,noreferrer");
        if (!opened) setError("YouTube link ဖွင့်မရသေးပါ။ Browser setting ကိုစစ်ပါ။");
      }}
    >
      <span className="faq-video-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={video.thumbnailUrl} />
        <i><Play fill="currentColor" size={18} /></i>
      </span>
      <span className="faq-video-copy">
        <strong>{video.title}</strong>
        <small>{video.channelName} · YouTube</small>
        {error ? <em>{error}</em> : null}
      </span>
    </button>
  );
}

function AnswerCard({ message, onFeedback }: {
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
        <section><h3>စစ်ရန်</h3><ul className="faq-checklist">{response.checklist.map((item) => (
          <li className={`is-${item.status}`} key={item.text}><ChecklistIcon status={item.status} /><span>{item.text}</span></li>
        ))}</ul></section>
      ) : null}
      {response.questionsToAsk.length > 0 ? (
        <section><h3>ထပ်မေးရန်</h3><ul>{response.questionsToAsk.map((item) => <li key={item}>{item}</li>)}</ul></section>
      ) : null}
      {response.warnings.length > 0 ? (
        <section><h3>သတိထားရန်</h3><ul className="faq-warnings">{response.warnings.map((item) => <li key={item}>{item}</li>)}</ul></section>
      ) : null}
      {response.videos.length > 0 ? (
        <section><h3>ဆက်စပ် လေ့လာရန်</h3><div className="faq-video-list">{response.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>
      ) : null}
      {response.confidence === "low" || response.needsHumanHelp ? <p className="faq-confidence">အချက်အလက် မလုံလောက်နိုင်လို့ center သို့မဟုတ် EcoLink team ကိုထပ်စစ်ပါ။</p> : null}
      <div className="faq-feedback" aria-label="Assistant answer feedback">
        <button type="button" onClick={() => onFeedback(message.id, "useful")}><ThumbsUp size={15} />အသုံးဝင်သည်</button>
        <button type="button" onClick={() => onFeedback(message.id, "not_useful")}><ThumbsDown size={15} />မအသုံးဝင်ပါ</button>
      </div>
    </article>
  );
}

export function FaqAssistantScreen() {
  const [messages, setMessages] = useState<FaqAssistantMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const latestRef = useRef<HTMLDivElement>(null);

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
      setError("Internet မရှိသေးပါ။ Connection ပြန်ရမှ ထပ်မေးပါ။");
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
      setError(sendError instanceof Error ? sendError.message : "Assistant ကို ခဏအသုံးပြုမရသေးပါ။");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(messageId: string, value: "useful" | "not_useful") {
    await fetch("/api/faq-assistant/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, value }),
    }).catch(() => undefined);
  }

  return (
    <main className="content-container faq-page">
      <header className="faq-header">
        <div><span><Leaf size={16} /> EcoGuide</span><h1>EcoLink FAQ assistant</h1><p>Recycling, drop-off, points, rewards နဲ့ report လုပ်တာတွေကို မေးနိုင်ပါတယ်။</p></div>
        <strong className={offline ? "is-offline" : ""}>{offline ? <WifiOff size={15} /> : <span />} {offline ? "Offline" : "Online"}</strong>
      </header>

      <section className="faq-chat-shell" aria-label="EcoGuide chat">
        <div className="faq-message-list">
          {messages.length === 0 ? (
            <div className="faq-empty">
              <Leaf size={30} />
              <h2>ဘာ recycle လုပ်ရမလဲ မသေချာဘူးလား?</h2>
              <div>{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => send(starter)}>{starter}</button>)}</div>
            </div>
          ) : messages.map((message) => (
            <div className={`faq-message is-${message.role}`} key={message.id}>
              {message.role === "user" ? <p>{message.content}</p> : <AnswerCard message={message} onFeedback={sendFeedback} />}
            </div>
          ))}
          {loading ? <div className="faq-loading"><RefreshCcw size={16} />EcoGuide စဉ်းစားနေပါတယ်...</div> : null}
          {error ? <div className="faq-error"><span>{error}</span><button type="button" onClick={() => send(messages.filter((item) => item.role === "user").at(-1)?.content ?? "")}>Retry</button></div> : null}
          <div ref={latestRef} />
        </div>

        <form className="faq-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <label className="sr-only" htmlFor="faq-question">EcoGuide ကိုမေးရန်</label>
          <textarea id="faq-question" value={question} maxLength={700} placeholder="ဥပမာ - plastic bottle cap ကိုခွဲထားရမလား?" onChange={(event) => setQuestion(event.target.value)} />
          <button aria-label="Send question" type="submit" disabled={loading || !question.trim()}><Send size={18} /></button>
        </form>
      </section>
    </main>
  );
}
