import { ShieldCheck } from "lucide-react";

import { SiteNavigation } from "@/components/layout/site-navigation";
import { requireUserId } from "@/lib/auth";

export default async function DashboardPage() {
  const userId = await requireUserId();

  return (
    <main className="min-h-screen bg-background">
      <SiteNavigation />
      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-12">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
          Authenticated workspace
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            EcoLink dashboard
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            This protected route confirms Clerk middleware, server-side auth,
            session persistence, and signed-in navigation are wired.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Signed in as Clerk user <span className="font-medium text-foreground">{userId}</span>.
        </div>
      </section>
    </main>
  );
}
