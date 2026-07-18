"use client";

import { useEffect, useRef } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";

import type { PickupLoopRoute } from "@/features/recycling-routes/types";

const ROUTE_COLORS = { A: "#087c78", B: "#d97706" } as const;

export function AdminPickupLoopMap({ routes }: { routes: PickupLoopRoute[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token || routes.length === 0) return;
    let cancelled = false;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL ?? "mapbox://styles/mapbox/streets-v12",
        center: [96.153, 16.828],
        zoom: 11.5,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        const bounds = new mapboxgl.LngLatBounds();
        for (const route of routes) {
          if (route.geometry.length > 1) {
            map.addSource(`pickup-loop-${route.routeCode}`, {
              type: "geojson",
              data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.geometry } },
            });
            map.addLayer({
              id: `pickup-loop-${route.routeCode}`,
              type: "line",
              source: `pickup-loop-${route.routeCode}`,
              paint: { "line-color": ROUTE_COLORS[route.routeCode], "line-width": 5, "line-opacity": 0.9 },
            });
            route.geometry.forEach((coordinate) => bounds.extend(coordinate));
          }
          route.stops.forEach((stop) => {
            const element = document.createElement("span");
            element.className = `pickup-loop-stop pickup-loop-stop--${route.routeCode.toLowerCase()}`;
            element.textContent = String(stop.stopOrder);
            element.setAttribute("aria-label", `Route ${route.routeCode}, stop ${stop.stopOrder}`);
            markersRef.current.push(new mapboxgl.Marker({ element }).setLngLat([stop.longitude, stop.latitude]).addTo(map));
            bounds.extend([stop.longitude, stop.latitude]);
          });
        }
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 52, maxZoom: 14, duration: 0 });
      });
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [routes, token]);

  if (!token) return <div className="pickup-loop-map pickup-loop-map--fallback">Map preview needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. Route summaries remain available below.</div>;
  if (routes.length === 0) return <div className="pickup-loop-map pickup-loop-map--fallback">No route loops have been generated yet.</div>;
  return <div className="pickup-loop-map" ref={containerRef} role="img" aria-label="Two circular pickup routes with numbered collection stops" />;
}
