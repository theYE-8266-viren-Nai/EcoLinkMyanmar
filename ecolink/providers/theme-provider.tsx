"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ComponentProps, ReactNode } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemeProvider> & {
  children: ReactNode;
};

/**
 * Provides light, dark, and system theme support for the design system.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      {...props}
    >
      {children}
    </NextThemeProvider>
  );
}
