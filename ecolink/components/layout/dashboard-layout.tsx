import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DashboardLayoutProps = {
  children: ReactNode;
  sidebar?: ReactNode;
  navbar?: ReactNode;
  className?: string;
};

/**
 * DashboardLayout creates a dense, scannable shell for authenticated tools.
 */
export function DashboardLayout({
  children,
  className,
  navbar,
  sidebar,
}: DashboardLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      {navbar}
      <div className="mx-auto flex w-full max-w-7xl">
        {sidebar ? (
          <aside className="hidden w-64 shrink-0 border-r bg-muted/20 lg:block">
            {sidebar}
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
