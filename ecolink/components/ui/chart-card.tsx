"use client";

import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type ChartCardProps = {
  children: ReactNode;
  className?: string;
  config: ChartConfig;
  description?: string;
  title: string;
};

/**
 * ChartCard frames Recharts visualizations with EcoLink dashboard styling.
 */
export function ChartCard({
  children,
  className,
  config,
  description,
  title,
}: ChartCardProps) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config}>{children}</ChartContainer>
      </CardContent>
    </Card>
  );
}
