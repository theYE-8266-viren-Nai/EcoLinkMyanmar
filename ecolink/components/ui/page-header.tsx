import type { ReactNode } from "react";

import { Breadcrumb, BreadcrumbList } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  title: string;
};

/**
 * PageHeader standardizes route-level titles, actions, and breadcrumbs.
 */
export function PageHeader({
  actions,
  breadcrumbs,
  className,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {breadcrumbs ? (
        <Breadcrumb>
          <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
