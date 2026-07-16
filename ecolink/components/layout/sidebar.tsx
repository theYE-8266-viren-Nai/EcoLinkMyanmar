import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  href: string;
  icon?: LucideIcon;
  label: string;
  badge?: string;
  active?: boolean;
};

export type SidebarProps = {
  className?: string;
  items: SidebarItem[];
  label?: string;
};

/**
 * Sidebar supports dense dashboard navigation with text, icons, and badges.
 */
export function Sidebar({ className, items, label = "Dashboard" }: SidebarProps) {
  return (
    <nav className={cn("space-y-1 p-3", className)} aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              item.active && "bg-muted text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
          </Link>
        );
      })}
    </nav>
  );
}
