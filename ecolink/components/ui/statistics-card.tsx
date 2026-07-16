import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatisticsCardProps = {
  className?: string;
  description?: string;
  icon?: LucideIcon;
  label: string;
  trend?: ReactNode;
  value: ReactNode;
};

/**
 * StatisticsCard displays one operational metric with optional trend context.
 */
export function StatisticsCard({
  className,
  description,
  icon: Icon,
  label,
  trend,
  value,
}: StatisticsCardProps) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        {Icon ? (
          <CardAction>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {trend ? <Badge variant="secondary">{trend}</Badge> : null}
          {description ? <span>{description}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
