"use client";

import dynamic from "next/dynamic";

import type { LiveMapBootstrap } from "@/features/live-map/data/load-map-bootstrap";
import { useI18n } from "@/lib/i18n";

function LiveMapLoading() {
  const { t } = useI18n();

  return (
    <main className="live-map-loading" aria-label={t("map.loading")}>
      <div className="live-map-loading__panel" />
      <span>{t("map.loading")}</span>
    </main>
  );
}

const LiveMap = dynamic(
  () => import("@/features/live-map/components/live-map").then((module) => module.LiveMap),
  {
    ssr: false,
    loading: () => <LiveMapLoading />,
  },
);

export function LiveMapLoader(props: LiveMapBootstrap) {
  return <LiveMap {...props} />;
}
