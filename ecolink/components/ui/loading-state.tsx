import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type LoadingStateProps = {
  className?: string;
  description?: string;
  title?: string;
};

/**
 * LoadingState provides a calm page or panel-level loading message.
 */
export function LoadingState({
  className,
  description = "Preparing the latest information.",
  title = "Loading",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center",
        className,
      )}
      role="status"
    >
      <LoadingSpinner size="lg" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * LoadingListSkeleton reserves stable space for list and table loading states.
 */
export function LoadingListSkeleton({
  className,
  rows = 5,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton className="h-12 w-full rounded-lg" key={index} />
      ))}
    </div>
  );
}
