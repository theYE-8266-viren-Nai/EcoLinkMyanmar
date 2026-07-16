import { Search } from "lucide-react";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchBarProps = ComponentProps<typeof Input> & {
  containerClassName?: string;
};

/**
 * SearchBar standardizes compact search inputs across dashboards and lists.
 */
export function SearchBar({
  className,
  containerClassName,
  placeholder = "Search",
  ...props
}: SearchBarProps) {
  return (
    <div className={cn("relative w-full", containerClassName)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        className={cn("pl-8", className)}
        placeholder={placeholder}
        type="search"
        {...props}
      />
    </div>
  );
}
