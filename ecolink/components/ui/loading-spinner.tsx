import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type LoadingSpinnerProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClassName = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
};

/**
 * LoadingSpinner communicates compact pending work with an accessible label.
 */
export function LoadingSpinner({
  className,
  label = "Loading",
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <span
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className={cn("animate-spin text-muted-foreground", sizeClassName[size])}
      />
    </span>
  );
}
