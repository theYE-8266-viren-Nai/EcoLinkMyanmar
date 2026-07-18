import { Leaf } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavigationItem = {
  href: string;
  label: string;
  badge?: string;
};

export type NavbarProps = {
  actions?: ReactNode;
  className?: string;
  items?: NavigationItem[];
};

const defaultItems: NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

/**
 * Navbar provides a stable desktop navigation surface with optional actions.
 */
export function Navbar({ actions, className, items = defaultItems }: NavbarProps) {
  return (
    <header className={cn("border-b bg-background/95", className)}>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link className="flex items-center gap-2 font-semibold" href="/">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Leaf aria-hidden="true" className="size-4" />
          </span>
          EcoLink
        </Link>
        <div className="sm:hidden">
          <MobileNavigation items={items} />
        </div>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {items.map((item) => (
            <Link
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              href={item.href}
              key={item.href}
            >
              {item.label}
              {item.badge ? (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
