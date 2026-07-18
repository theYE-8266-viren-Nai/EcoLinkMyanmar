import { APPROVED_VIDEO_SEEDS, FAQ_SEED_ARTICLES } from "@/features/faq-assistant/services/seed-data";
import type { ApprovedVideo, FaqArticle, RetrievedFaqContext } from "@/features/faq-assistant/types/faq-assistant";
import { tokenize } from "@/features/faq-assistant/utils/text";

const KEYWORD_GROUPS = {
  system: ["ecolink", "system", "workflow", "process", "app", "guide", "work"],
  scanner: ["scanner", "scan", "ai", "image", "photo", "estimate", "confidence", "detect"],
  awareness: ["aware", "awareness", "teach", "educate", "education", "people", "community", "campaign", "habit", "promote", "encourage", "learn"],
  reduceReuse: ["reduce", "reuse", "re-use", "refill", "repair", "donate", "secondhand", "second-hand", "waste less", "avoid"],
  household: ["home", "house", "household", "family", "room", "bin", "bins", "store", "collection"],
  commonItems: ["common", "items", "curbside", "accepted", "accepts", "usually", "typical", "list"],
  account: ["progress", "balance", "impact", "dashboard", "my", "mine", "status", "approved", "pending", "rejected"],
  plastic: ["plastic", "bottle", "pet", "hdpe", "clean", "dry", "cap", "label"],
  paper: ["paper", "cardboard", "wet", "oily", "dry", "box"],
  ewaste: ["e-waste", "ewaste", "electronic", "electronics", "electrical", "battery", "phone", "power", "hazardous", "swollen"],
  glassMetal: ["glass", "metal", "can", "broken", "sharp", "aerosol", "chemical"],
  dropoff: ["drop-off", "dropoff", "center", "qr", "member", "points", "verified", "weight"],
  rewards: ["reward", "redeem", "claim", "points", "partner", "stock", "fulfill"],
  reports: ["report", "issue", "illegal", "dumping", "waste", "hazardous", "location", "dirtiness"],
  contamination: ["contamination", "dirty", "wet", "food", "chemical", "medical", "oil"],
} as const;

const AWARENESS_TERMS = new Set(KEYWORD_GROUPS.awareness);
const ACCOUNT_TERMS = new Set(KEYWORD_GROUPS.account);
const COMMON_ITEM_TERMS = new Set(KEYWORD_GROUPS.commonItems);
const HOUSEHOLD_TERMS = new Set(KEYWORD_GROUPS.household);
const REDUCE_REUSE_TERMS = new Set(KEYWORD_GROUPS.reduceReuse);
const RECYCLING_TERMS = new Set(["recycle", "recycling", "recyclable", "recyclables"]);

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
    const normalizedSynonyms = new Set([...synonyms].map((term) => term.toLowerCase()));
    let overlap = 0;
    for (const term of normalizedSynonyms) {
      if (tokens.has(term)) overlap += 1;
    }
    if (overlap > 0 && record.keywords.some((keyword) => normalizedSynonyms.has(keyword.toLowerCase()))) score += overlap * 2;
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

function inferCategoryFromTokens(tokens: Set<string>) {
  if ([...ACCOUNT_TERMS].some((term) => tokens.has(term)) && (tokens.has("point") || tokens.has("points") || tokens.has("report") || tokens.has("reports") || tokens.has("progress") || tokens.has("impact"))) {
    return "account-progress";
  }
  const hasAwarenessIntent = [...AWARENESS_TERMS].some((term) => tokens.has(term));
  const hasRecyclingIntent = [...RECYCLING_TERMS].some((term) => tokens.has(term));
  if (hasAwarenessIntent && hasRecyclingIntent) return "recycling-awareness";
  if ([...REDUCE_REUSE_TERMS].some((term) => tokens.has(term))) return "reduce-reuse";
  if ([...HOUSEHOLD_TERMS].some((term) => tokens.has(term)) && hasRecyclingIntent) return "household-recycling";
  if ([...COMMON_ITEM_TERMS].some((term) => tokens.has(term)) && hasRecyclingIntent) return "common-recyclables";
  return undefined;
}

export function retrieveFaqContext(input: {
  question: string;
  category?: string;
  articles?: FaqArticle[];
  videos?: ApprovedVideo[];
}): RetrievedFaqContext {
  const tokens = new Set(tokenize(`${input.question} ${input.category ?? ""}`));
  const effectiveCategory = input.category ?? inferCategoryFromTokens(tokens);
  const detectedTopics = topicTokens([...tokens]);
  const sourceArticles = input.articles ?? FAQ_SEED_ARTICLES;
  const scoredArticles: Array<{ article: FaqArticle; score: number }> = [];
  for (const article of sourceArticles) {
    if (!article.isPublished) continue;
    const score = scoreRecord(article, tokens, effectiveCategory);
    if (score > 0) scoredArticles.push({ article, score });
  }
  const articles = scoredArticles
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.article);
  const scoredVideos: Array<{ video: ApprovedVideo; score: number }> = [];
  for (const video of input.videos ?? APPROVED_VIDEO_SEEDS) {
    if (!video.isApproved) continue;
    const score = scoreVideo(video, tokens, effectiveCategory);
    if (score > 0) scoredVideos.push({ video, score });
  }
  const videos = scoredVideos
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
