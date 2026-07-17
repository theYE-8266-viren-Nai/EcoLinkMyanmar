"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { EcoLinkProvider } from "@/providers/ecolink-provider";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ThemeProvider>
        <EcoLinkProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors />
          </TooltipProvider>
        </EcoLinkProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
