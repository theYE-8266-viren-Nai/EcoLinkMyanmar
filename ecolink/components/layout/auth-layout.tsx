import { Leaf } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AuthLayoutProps = {
  children: ReactNode;
  description: string;
  title: string;
  className?: string;
};

/**
 * AuthLayout frames sign-in and sign-up flows with EcoLink brand context.
 */
export function AuthLayout({
  children,
  className,
  description,
  title,
}: AuthLayoutProps) {
  return (
    <main className={cn("flex min-h-screen bg-background", className)}>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-10 md:grid-cols-[360px_1fr] md:items-center md:py-16">
        <aside className="space-y-6">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
            href="/"
          >
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Leaf aria-hidden="true" className="size-4" />
            </span>
            EcoLink
          </Link>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </aside>
        <div className="flex justify-center">{children}</div>
      </section>
    </main>
  );
}
