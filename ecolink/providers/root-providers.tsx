"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { ReactNode } from "react";

import { PostHogProvider } from "@/providers/posthog-provider";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        theme: shadcn,
      }}
    >
      <PostHogProvider>{children}</PostHogProvider>
    </ClerkProvider>
  );
}
