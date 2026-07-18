import { APPROVED_VIDEO_SEEDS, FAQ_SEED_ARTICLES } from "@/features/faq-assistant/services/seed-data";
import type { ApprovedVideo, FaqArticle, RetrievedFaqContext } from "@/features/faq-assistant/types/faq-assistant";
import { tokenize } from "@/features/faq-assistant/utils/text";

const KEYWORD_GROUPS = {
  system: ["ecolink", "system", "workflow", "process", "app", "guide", "how", "work"],
  scanner: ["scanner", "scan", "ai", "image", "photo", "estimate", "confidence", "detect"],
  plastic: ["plastic", "bottle", "pet", "hdpe", "clean", "dry", "recycle", "cap", "label"],
  paper: ["paper", "cardboard", "wet", "oily", "dry", "box"],
  ewaste: ["e-waste", "ewaste", "battery", "phone", "power", "hazardous", "swollen"],
  glassMetal: ["glass", "metal", "can", "broken", "sharp", "aerosol", "chemical"],
  dropoff: ["drop-off", "dropoff", "center", "qr", "member", "points", "verified", "weight"],
  rewards: ["reward", "redeem", "claim", "points", "partner", "stock", "fulfill"],
  reports: ["report", "illegal", "dumping", "waste", "hazardous", "location", "dirtiness"],
  contamination: ["contamination", "dirty", "wet", "food", "chemical", "medical", "oil"],
} as const;

function topicTokens(input: string[]) {
  const source = new Set(input);
  const topics: string[] = [];
  for (const [topic, synonyms] of Object.entries(KEYWORD_GROUPS)) {
    if (synonyms.some((term) => source.has(term.toLowerCase()))) topics.push(topic);
  }
  return topics;
}

function scoreRecord(record: Pick<FaqArticle, "title" | "category" | "keywords" | "riskLevel">, tokens: Set<string>, category?: string) {
  let score = 0;
  if (category && record.category === category) score += 12;
  for (const token of tokenize(record.title)) if (tokens.has(token)) score += 4;
  for (const keyword of record.keywords) {
    if (tokenize(keyword).some((token) => tokens.has(token))) score += 5;
  }
  for (const synonyms of Object.values(KEYWORD_GROUPS)) {
    const normalizedSynonyms: string[] = [...synonyms].map((term) => term.toLowerCase());
    const overlap = normalizedSynonyms.filter((term) => tokens.has(term)).length;
    if (overlap > 0 && record.keywords.some((keyword) => normalizedSynonyms.includes(keyword.toLowerCase()))) score += overlap * 2;
  }
  if (record.riskLevel === "high" && /battery|hazardous|chemical|medical|broken|sharp|illegal|waste/.test([...tokens].join(" "))) score += 4;
  return score;
}

function scoreVideo(video: ApprovedVideo, tokens: Set<string>, category?: string) {
  let score = category && video.category === category ? 10 : 0;
  for (const token of tokenize(video.title)) if (tokens.has(token)) score += 3;
  for (const tag of video.tags) if (tokenize(tag).some((token) => tokens.has(token))) score += 4;
  return score;
}

export function retrieveFaqContext(input: {
  question: string;
  category?: string;
  articles?: FaqArticle[];
  videos?: ApprovedVideo[];
}): RetrievedFaqContext {
  const tokens = new Set(tokenize(`${input.question} ${input.category ?? ""}`));
  const detectedTopics = topicTokens([...tokens]);
  const sourceArticles = input.articles ?? FAQ_SEED_ARTICLES;
  const articles = sourceArticles
    .filter((article) => article.isPublished)
    .map((article) => ({ article, score: scoreRecord(article, tokens, input.category) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.article);
  const videos = (input.videos ?? APPROVED_VIDEO_SEEDS)
    .filter((video) => video.isApproved)
    .map((video) => ({ video, score: scoreVideo(video, tokens, input.category) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.video);
  const fallbackArticles = articles.length > 0
    ? articles
    : sourceArticles
      .filter((article) => article.isPublished && ["ecolink-system", "general-recycling"].includes(article.category))
      .slice(0, 3);

  return { articles: fallbackArticles, videos, detectedTopics };
}
