import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type CardBaseProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  title: string;
};

/**
 * FeatureCard introduces reusable product capabilities with icon support.
 */
export function FeatureCard({
  action,
  className,
  description,
  icon: Icon,
  title,
}: CardBaseProps & { icon?: LucideIcon }) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader>
        {Icon ? (
          <span className="mb-2 w-fit rounded-lg bg-primary/10 p-2 text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        ) : null}
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

/**
 * ImpactCard visualizes progress toward an environmental or community outcome.
 */
export function ImpactCard({
  className,
  description,
  label,
  title,
  value,
}: CardBaseProps & { label: string; value: number }) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}%</span>
        </div>
        <Progress value={value} />
      </CardContent>
    </Card>
  );
}

/**
 * PartnerCard presents trusted organizations, NGOs, or sponsors.
 */
export function PartnerCard({
  badge,
  className,
  description,
  logoUrl,
  title,
}: CardBaseProps & { badge?: string; logoUrl?: string }) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader className="grid-cols-[auto_1fr_auto]">
        <Avatar className="size-10">
          <AvatarImage alt="" src={logoUrl} />
          <AvatarFallback>{title.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </CardHeader>
    </Card>
  );
}

/**
 * TestimonialCard displays a short quote with attribution.
 */
export function TestimonialCard({
  avatarUrl,
  className,
  name,
  quote,
  role,
}: {
  avatarUrl?: string;
  className?: string;
  name: string;
  quote: string;
  role?: string;
}) {
  return (
    <Card className={cn("rounded-lg", className)}>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm leading-6 text-muted-foreground">&ldquo;{quote}&rdquo;</p>
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage alt="" src={avatarUrl} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{name}</p>
            {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
