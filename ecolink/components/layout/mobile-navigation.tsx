"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { NavigationItem } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type MobileNavigationProps = {
  actions?: ReactNode;
  items: NavigationItem[];
  title?: string;
};

/**
 * MobileNavigation exposes primary links in an accessible slide-out sheet.
 */
export function MobileNavigation({
  actions,
  items,
  title = "Navigation",
}: MobileNavigationProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button aria-label="Open navigation" size="icon" variant="outline" />}>
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Move between EcoLink work areas.</SheetDescription>
        </SheetHeader>
        <nav className="grid gap-1 px-4" aria-label="Mobile primary">
          {items.map((item) => (
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {actions ? <div className="mt-auto border-t p-4">{actions}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
