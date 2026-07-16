import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedbackStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  icon?: LucideIcon;
  title: string;
  tone?: "neutral" | "success" | "error" | "warning";
};

const toneClassName = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

/**
 * FeedbackState is the base for empty, error, success, and not-found states.
 */
export function FeedbackState({
  action,
  className,
  description,
  icon: Icon = Inbox,
  title,
  tone = "neutral",
}: FeedbackStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-56 flex-col items-center justify-center rounded-xl border bg-card p-8 text-center",
        className,
      )}
    >
      <span className={cn("mb-4 rounded-lg p-2", toneClassName[tone])}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * EmptyState guides users toward the next useful action.
 */
export function EmptyState(props: Omit<FeedbackStateProps, "icon" | "tone">) {
  return <FeedbackState icon={Inbox} tone="neutral" {...props} />;
}

/**
 * ErrorState presents recoverable failures without exposing internals.
 */
export function ErrorState(props: Omit<FeedbackStateProps, "icon" | "tone">) {
  return <FeedbackState icon={AlertTriangle} tone="error" {...props} />;
}

/**
 * SuccessState confirms completion and explains what changed.
 */
export function SuccessState(props: Omit<FeedbackStateProps, "icon" | "tone">) {
  return <FeedbackState icon={CheckCircle2} tone="success" {...props} />;
}

/**
 * NotFoundState is the reusable 404 component for missing resources.
 */
export function NotFoundState({
  action,
  description = "The resource may have moved, expired, or never existed.",
  title = "Page not found",
}: Partial<Pick<FeedbackStateProps, "action" | "description" | "title">>) {
  return (
    <FeedbackState
      action={
        action ?? (
          <Link className={buttonVariants({ variant: "outline" })} href="/">
            Go home
          </Link>
        )
      }
      description={description}
      icon={FileQuestion}
      title={title}
      tone="warning"
    />
  );
}
