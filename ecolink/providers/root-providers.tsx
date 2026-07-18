"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { EcoLinkProvider } from "@/providers/ecolink-provider";
import { MuiProvider } from "@/providers/mui-theme-provider";
import { PointerCaptureGuard } from "@/providers/pointer-capture-guard";
import { PwaLifecycle } from "@/providers/pwa-lifecycle";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <MuiProvider>
      <I18nProvider>
        <EcoLinkProvider>
          <TooltipProvider>
            <PwaLifecycle />
            <PointerCaptureGuard />
            {children}
            <Toaster richColors />
          </TooltipProvider>
        </EcoLinkProvider>
      </I18nProvider>
    </MuiProvider>
  );
}
