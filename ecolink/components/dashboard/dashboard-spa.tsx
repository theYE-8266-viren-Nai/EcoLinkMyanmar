"use client";

import {
  Bell,
  House,
  MapPinned,
  Recycle,
  Trophy,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { EcoLinkUserButton } from "@/components/auth/user-button";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "home", label: "Home", icon: House },
  { id: "requests", label: "Requests", icon: Recycle },
  { id: "rewards", label: "Rewards", icon: Trophy },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

type DashboardTab = (typeof tabs)[number]["id"];

export function DashboardSpa({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveIcon = active.icon;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex h-16 items-center justify-between bg-teal-500 px-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <Recycle aria-hidden="true" className="size-6" />
          <span className="font-semibold tracking-wide">EcoLink</span>
        </div>
        <div className="flex items-center gap-3">
          <Bell aria-label="Notifications" className="size-5" />
          <EcoLinkUserButton />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold">Make your next clean-up count.</h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as {userId}</p>
        </div>

        {activeTab === "home" ? (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="relative min-h-80 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_30%,#99f6e4,transparent_35%),linear-gradient(135deg,#dbeafe,#f8fafc)] p-5 shadow-sm">
              <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#94a3b8_1px,transparent_1px),linear-gradient(90deg,#94a3b8_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="relative flex items-center gap-2 text-sm font-medium">
                <MapPinned className="size-4 text-teal-600" />
                Nearby recycling points
              </div>
              <div className="relative mt-24 grid grid-cols-4 gap-4">
                {["Hlaing", "Sanchaung", "Downtown", "Tamwe", "Dagon", "Bahan", "Insein", "Kamayut"].map(
                  (place) => (
                    <div className="flex items-center gap-2 text-xs text-slate-600" key={place}>
                      <span className="size-3 rounded-full bg-teal-500 shadow ring-4 ring-white/70" />
                      {place}
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Stat title="Waste diverted" value="12.4 kg" detail="This month" />
              <Stat title="Eco points" value="860" detail="120 points to next reward" />
              <Stat title="Requests" value="3 active" detail="One pickup scheduled" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <ActiveIcon aria-hidden="true" className="mx-auto size-8 text-teal-600" />
            <h2 className="mt-3 text-xl font-semibold">{active.label}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              This workspace is ready for the next hackathon slice. Keep this view focused on one user outcome.
            </p>
          </div>
        )}
      </section>

      <nav className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-xl justify-around rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-slate-200 backdrop-blur" aria-label="Dashboard sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === activeTab;
          return (
            <button
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors",
                selected ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50",
              )}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}

function Stat({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
