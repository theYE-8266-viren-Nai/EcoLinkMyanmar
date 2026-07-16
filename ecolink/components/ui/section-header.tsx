import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionHeaderProps = {
  action?: ReactNode;
  className?: string;
  description?: string;
  title: string;
};

/**
 * SectionHeader labels dense dashboard and content sections.
 */
export function SectionHeader({
  action,
  className,
  description,
  title,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
