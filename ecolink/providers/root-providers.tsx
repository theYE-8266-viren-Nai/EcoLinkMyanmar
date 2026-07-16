"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        theme: shadcn,
      }}
    >
      <ThemeProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
