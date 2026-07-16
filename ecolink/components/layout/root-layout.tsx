import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type RootLayoutShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  className?: string;
};

/**
 * RootLayoutShell gives public pages a consistent document-level stack.
 */
export function RootLayoutShell({
  children,
  className,
  footer,
  header,
}: RootLayoutShellProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      {header}
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      {footer}
    </div>
  );
}
