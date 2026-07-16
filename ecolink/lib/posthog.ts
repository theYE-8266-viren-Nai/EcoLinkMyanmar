import { PostHog } from "posthog-node";

export const posthogBrowserConfig = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
};

let serverPostHog: PostHog | null = null;

export function getServerPostHog() {
  if (!process.env.POSTHOG_SERVER_API_KEY) {
    return null;
  }

  serverPostHog ??= new PostHog(process.env.POSTHOG_SERVER_API_KEY, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });

  return serverPostHog;
}
