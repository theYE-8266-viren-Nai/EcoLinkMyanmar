"use client";

import dynamic from "next/dynamic";

import type { LiveMapBootstrap } from "@/features/live-map/data/load-map-bootstrap";

const LiveMap = dynamic(
  () => import("@/features/live-map/components/live-map").then((module) => module.LiveMap),
  {
    ssr: false,
    loading: () => (
      <main className="live-map-loading" aria-label="Loading Yangon recycling map">
        <div className="live-map-loading__panel" />
        <span>Loading the Yangon map…</span>
      </main>
    ),
  },
);

export function LiveMapLoader(props: LiveMapBootstrap) {
  return <LiveMap {...props} />;
}
