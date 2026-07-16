import { Leaf } from "lucide-react";
import Link from "next/link";

import { AuthenticationButtons } from "@/components/auth/authentication-buttons";
import { buttonVariants } from "@/components/ui/button";

const navigationItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteNavigation() {
  return (
    <header className="border-b bg-background/95">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link className="flex items-center gap-2 font-semibold" href="/">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <Leaf aria-hidden="true" className="size-4" />
          </span>
          EcoLink
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {navigationItems.map((item) => (
            <Link
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthenticationButtons />
      </div>
    </header>
  );
}
