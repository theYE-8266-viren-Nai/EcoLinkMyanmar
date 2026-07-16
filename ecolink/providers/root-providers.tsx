"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { PostHogProvider } from "@/providers/posthog-provider";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </ClerkProvider>
  );
}
