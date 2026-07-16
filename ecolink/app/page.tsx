import { Leaf, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { RecyclingIntentForm } from "@/components/recycling-intent-form";
import { SiteNavigation } from "@/components/layout/site-navigation";
import { buttonVariants } from "@/components/ui/button";

const foundationCards = [
  { title: "Clerk", description: "Auth ready", Icon: ShieldCheck },
  { title: "Prisma", description: "Postgres ready", Icon: Sparkles },
  { title: "Forms", description: "Zod validated", Icon: Leaf },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <SiteNavigation />
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1fr_420px] md:items-center md:py-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
            <Leaf aria-hidden="true" className="size-4 text-primary" />
            Turn Waste into Worth
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              EcoLink connects recycling action with trusted local impact.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Foundational services are wired for authentication, data,
              validation, UI primitives, analytics, email, and storage.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {foundationCards.map(({ title, description, Icon }) => (
              <div className="rounded-xl border bg-card p-4" key={title}>
                <Icon aria-hidden="true" className="mb-3 size-5 text-primary" />
                <h2 className="font-medium">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className={buttonVariants()} href="/sign-up">
              Create account
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>

        <RecyclingIntentForm />
      </section>
    </main>
  );
}
