"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, Leaf, Play, RefreshCcw, Send, ThumbsDown, ThumbsUp, WifiOff } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { FaqAssistantClientResponse, FaqVideoCard } from "@/features/faq-assistant/schemas/faq-assistant";
import type { FaqAssistantMessage } from "@/features/faq-assistant/types/faq-assistant";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const [error, setError] = useState("");

  return (
    <button
      aria-label={t("faq.openYoutube", { title: video.title })}
      className="faq-video-card"
      type="button"
      onClick={() => {
        const opened = window.open(video.youtubeUrl, "_blank", "noopener,noreferrer");
        if (!opened) setError(t("faq.youtubeError"));
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
  const { t } = useI18n();
  const response = message.response;
  if (!response) return null;

  return (
    <article className="faq-answer-card">
      <div className="faq-answer-title"><Leaf aria-hidden="true" size={18} /><h2>{response.title}</h2></div>
      <p>{response.answer}</p>

      {response.checklist.length > 0 ? (
        <section>
          <h3>{t("faq.checklist")}</h3>
          <ul className="faq-checklist">
            {response.checklist.map((item) => (
              <li className={`is-${item.status}`} key={item.text}><ChecklistIcon status={item.status} /><span>{item.text}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {response.questionsToAsk.length > 0 ? (
        <section><h3>{t("faq.questions")}</h3><ul>{response.questionsToAsk.map((item) => <li key={item}>{item}</li>)}</ul></section>
      ) : null}

      {response.warnings.length > 0 ? (
        <section><h3>{t("faq.warnings")}</h3><ul className="faq-warnings">{response.warnings.map((item) => <li key={item}>{item}</li>)}</ul></section>
      ) : null}

      {response.videos.length > 0 ? (
        <section><h3>{t("faq.learning")}</h3><div className="faq-video-list">{response.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>
      ) : null}

      {response.confidence === "low" || response.needsHumanHelp ? (
        <p className="faq-confidence">{t("faq.confidence")}</p>
      ) : null}

      <div className="faq-feedback" aria-label={t("faq.feedback")}>
        <button type="button" onClick={() => onFeedback(message.id, "useful")}><ThumbsUp size={15} />{t("faq.useful")}</button>
        <button type="button" onClick={() => onFeedback(message.id, "not_useful")}><ThumbsDown size={15} />{t("faq.notUseful")}</button>
      </div>
    </article>
  );
}

export function FaqAssistantScreen({ mode = "page" }: { mode?: "page" | "panel" }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<FaqAssistantMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const latestRef = useRef<HTMLDivElement>(null);
  const inputId = mode === "panel" ? "faq-question-panel" : "faq-question";
  const starters = [
    t("faq.starterBottles"),
    t("faq.starterBatteries"),
    t("faq.starterPoints"),
    t("faq.starterReport"),
  ];

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
      setError(t("faq.offlineAsk"));
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
      const payload = await response.json().catch(() => ({ error: t("faq.readError") })) as { error?: string; messageId?: string; response?: FaqAssistantClientResponse };
      if (!response.ok || !payload.response || !payload.messageId) throw new Error(payload.error ?? t("faq.unavailable"));
      const assistantResponse = payload.response;
      const assistantMessageId = payload.messageId;
      setMessages((current) => [...current, { id: assistantMessageId, role: "assistant", content: assistantResponse.answer, response: assistantResponse }]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t("faq.tempUnavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={mode === "panel" ? "faq-page faq-page--panel" : "content-container faq-page"}>
      <header className="faq-header">
        <div><span><Leaf size={16} /> EcoGuide</span><h1>{t("faq.title")}</h1><p>{t("faq.subtitle")}</p></div>
        <strong className={offline ? "is-offline" : ""}>{offline ? <WifiOff size={15} /> : <span />} {offline ? t("faq.offline") : t("faq.online")}</strong>
      </header>

      <section className="faq-chat-shell" aria-label={t("faq.chatLabel")}>
        <div className="faq-message-list">
          {messages.length === 0 ? (
            <div className="faq-empty">
              <Leaf size={30} />
              <h2>{t("faq.emptyTitle")}</h2>
              <div>{starters.map((starter) => <button key={starter} type="button" onClick={() => send(starter)}>{starter}</button>)}</div>
            </div>
          ) : messages.map((message) => (
            <div className={`faq-message is-${message.role}`} key={message.id}>
              {message.role === "user" ? <p>{message.content}</p> : <AnswerCard message={message} onFeedback={sendFeedback} />}
            </div>
          ))}
          {loading ? <div className="faq-loading"><RefreshCcw size={16} />{t("faq.loading")}</div> : null}
          {error ? <div className="faq-error"><span>{error}</span><button type="button" onClick={() => send(messages.filter((item) => item.role === "user").at(-1)?.content ?? "")}>{t("faq.retry")}</button></div> : null}
          <div ref={latestRef} />
        </div>

        <form className="faq-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <label className="sr-only" htmlFor={inputId}>{t("faq.askLabel")}</label>
          <textarea id={inputId} value={question} maxLength={700} placeholder={t("faq.placeholder")} onChange={(event) => setQuestion(event.target.value)} />
          <button aria-label={t("faq.send")} type="submit" disabled={loading || !question.trim()}><Send size={18} /></button>
        </form>
      </section>
    </section>
  );
}
