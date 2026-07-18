import { z } from "zod";

import { APPROVED_VIDEO_SEEDS } from "@/features/faq-assistant/services/seed-data";
import type { ApprovedVideo } from "@/features/faq-assistant/types/faq-assistant";

const youtubeUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return ["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname);
}, "URL must be a YouTube URL.");

export function isValidYoutubeUrl(value: string) {
  return youtubeUrlSchema.safeParse(value).success;
}

export function mapTrustedVideos(videoIds: string[], approvedVideos: ApprovedVideo[] = APPROVED_VIDEO_SEEDS) {
  const approved = new Map(
    approvedVideos
      .filter((video) => video.isApproved && isValidYoutubeUrl(video.youtubeUrl))
      .map((video) => [video.id, video]),
  );

  return [...new Set(videoIds)]
    .map((id) => approved.get(id))
    .filter((video): video is ApprovedVideo => Boolean(video))
    .slice(0, 3)
    .map((video) => ({
      id: video.id,
      title: video.title,
      youtubeUrl: video.youtubeUrl,
      thumbnailUrl: video.thumbnailUrl,
      channelName: video.channelName,
      category: video.category,
    }));
}
