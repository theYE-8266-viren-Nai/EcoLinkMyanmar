import { Leaf } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type FooterLink = {
  href: string;
  label: string;
};

export type FooterProps = {
  className?: string;
  links?: FooterLink[];
};

/**
 * Footer provides a calm, compact page ending for public and dashboard shells.
 */
export function Footer({ className, links = [] }: FooterProps) {
  return (
    <footer className={cn("border-t bg-muted/20", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Leaf aria-hidden="true" className="size-4 text-primary" />
          <span>EcoLink. Turn Waste into Worth.</span>
        </div>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          {links.map((link) => (
            <Link className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
