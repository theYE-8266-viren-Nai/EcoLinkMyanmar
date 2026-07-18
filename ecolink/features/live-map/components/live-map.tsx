"use client";

import {
  AlertTriangle,
  Building2,
  CarFront,
  ChevronRight,
  CircleGauge,
  Layers3,
  LocateFixed,
  MapPin,
  Navigation,
  PanelBottomOpen,
  Recycle,
  RotateCcw,
  Signal,
  SignalZero,
  X,
} from "lucide-react";
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap } from "mapbox-gl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { createDemoVehicles } from "@/features/live-map/data/demo-map-data";
import type { LiveMapBootstrap } from "@/features/live-map/data/load-map-bootstrap";
import type {
  CollectorVehicleLocation,
  MapFeatureCollection,
  RecyclingCenterMapItem,
  WasteMapResponse,
} from "@/features/live-map/types";
import {
  getVehicleFreshness,
  vehiclesToFeatureCollection,
  YANGON_BOUNDS,
  YANGON_CENTER,
  YANGON_ZOOM,
} from "@/features/live-map/utils/map-data";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const EMPTY_FEATURES: MapFeatureCollection = { type: "FeatureCollection", features: [] };
const MAP_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
  ?? "mapbox://styles/happer64bit/clnpqzscu00dj01qqhgrkhawy";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const HAS_SUPABASE_CONFIG = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

type SelectedMapItem =
  | { kind: "center"; center: RecyclingCenterMapItem }
  | { kind: "vehicle"; vehicle: CollectorVehicleLocation }
  | { kind: "report"; score: number; wasteType: string; observedAt: string }
  | null;

type MobilePanelTab = "centers" | "collectors";

const MOBILE_PANEL_TABS = [
  { value: "centers", label: "Centers", Icon: Building2 },
  { value: "collectors", label: "Collectors", Icon: CarFront },
] as const satisfies ReadonlyArray<{
  value: MobilePanelTab;
  label: string;
  Icon: typeof Layers3;
}>;

function centersToFeatureCollection(centers: RecyclingCenterMapItem[]): MapFeatureCollection {
  return {
    type: "FeatureCollection",
    features: centers.map((center) => ({
      type: "Feature",
      id: center.id,
      geometry: { type: "Point", coordinates: [center.longitude, center.latitude] },
      properties: { id: center.id, name: center.name, township: center.township },
    })),
  };
}

function setLayerVisibility(map: MapboxMap, layerIds: string[], visible: boolean) {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }
}

function formatUpdatedAt(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

function addMapSourcesAndLayers(map: MapboxMap, centers: RecyclingCenterMapItem[]) {
  map.addSource("waste-density", { type: "geojson", data: EMPTY_FEATURES });
  map.addSource("waste-reports", {
    type: "geojson",
    data: EMPTY_FEATURES,
    cluster: true,
    clusterMaxZoom: 16,
    clusterRadius: 48,
  });
  map.addSource("recycling-centers", { type: "geojson", data: centersToFeatureCollection(centers) });
  map.addSource("collector-vehicles", { type: "geojson", data: EMPTY_FEATURES });

  map.addLayer({
    id: "waste-heatmap",
    type: "heatmap",
    source: "waste-density",
    maxzoom: 12,
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["*", ["get", "count"], ["get", "averageScore"]], 1, 0.12, 40, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 12, 1.8],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 12, 42],
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(8,124,120,0)",
        0.2, "rgba(44,150,137,0.45)",
        0.45, "rgba(244,194,74,0.68)",
        0.7, "rgba(238,126,62,0.82)",
        1, "rgba(184,55,72,0.94)",
      ],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11.4, 0.9, 12, 0],
    },
  });

  map.addLayer({
    id: "waste-clusters",
    type: "circle",
    source: "waste-reports",
    minzoom: 12,
    maxzoom: 17,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#b7374c",
      "circle-radius": ["step", ["get", "point_count"], 16, 5, 20, 12, 25],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });

  map.addLayer({
    id: "waste-cluster-count",
    type: "symbol",
    source: "waste-reports",
    minzoom: 12,
    maxzoom: 17,
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
    paint: { "text-color": "#ffffff" },
  });

  map.addLayer({
    id: "waste-report-points",
    type: "circle",
    source: "waste-reports",
    minzoom: 12,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["interpolate", ["linear"], ["get", "score"], 1, "#2d9689", 5, "#efb94f", 10, "#b7374c"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 7, 18, 12],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });

  map.addLayer({
    id: "center-halo",
    type: "circle",
    source: "recycling-centers",
    paint: { "circle-radius": 14, "circle-color": "rgba(255,255,255,0.92)" },
  });
  map.addLayer({
    id: "center-points",
    type: "circle",
    source: "recycling-centers",
    paint: { "circle-radius": 9, "circle-color": "#087c78", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
  });
  map.addLayer({
    id: "center-labels",
    type: "symbol",
    source: "recycling-centers",
    minzoom: 13,
    layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.8], "text-anchor": "top" },
    paint: { "text-color": "#0b3558", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
  });

  map.addLayer({
    id: "collector-points",
    type: "circle",
    source: "collector-vehicles",
    paint: {
      "circle-radius": 13,
      "circle-color": ["case", ["==", ["get", "freshness"], "stale"], "#68737d", "#0b3558"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "collector-direction",
    type: "symbol",
    source: "collector-vehicles",
    layout: { "text-field": "▲", "text-size": 12, "text-rotate": ["get", "heading"], "text-rotation-alignment": "map" },
    paint: { "text-color": "#ffffff" },
  });
}

export function LiveMap({ centers, vehicles: initialVehicles, demoMode }: LiveMapBootstrap) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(!MAPBOX_TOKEN);
  const [mapError, setMapError] = useState("");
  const [wasteLoading, setWasteLoading] = useState(true);
  const [wasteMode, setWasteMode] = useState<WasteMapResponse["mode"]>("heatmap");
  const [wasteCount, setWasteCount] = useState(0);
  const [showWaste, setShowWaste] = useState(true);
  const [showCenters, setShowCenters] = useState(true);
  const [showCollectors, setShowCollectors] = useState(true);
  const [isMobileMap, setIsMobileMap] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
  const [mobilePanelTab, setMobilePanelTab] = useState<MobilePanelTab>("centers");
  const [selected, setSelected] = useState<SelectedMapItem>(null);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [realtimeState, setRealtimeState] = useState<"connecting" | "live" | "offline">(
    demoMode ? "live" : HAS_SUPABASE_CONFIG ? "connecting" : "offline",
  );
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const syncMobileState = () => setIsMobileMap(query.matches);
    syncMobileState();
    query.addEventListener("change", syncMobileState);
    return () => query.removeEventListener("change", syncMobileState);
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;
    mapContainerRef.current.replaceChildren();
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: YANGON_CENTER,
      zoom: YANGON_ZOOM,
      minZoom: 9,
      maxZoom: 19,
      maxBounds: YANGON_BOUNDS,
      attributionControl: true,
      cooperativeGestures: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      addMapSourcesAndLayers(map, centers);
      setMapReady(true);
      setMapUnavailable(false);
    });
    map.on("error", (event) => {
      console.error("Mapbox rendering error", event.error);
      setMapError("The map could not load its basemap. Center information is still available.");
    });

    map.on("click", "center-points", (event) => {
      const id = String(event.features?.[0]?.properties?.id ?? "");
      const center = centers.find((item) => item.id === id);
      if (center) setSelected({ kind: "center", center });
    });
    map.on("click", "collector-points", (event) => {
      const properties = event.features?.[0]?.properties;
      if (!properties) return;
      setSelected({
        kind: "vehicle",
        vehicle: {
          vehicleId: String(properties.vehicleId),
          label: String(properties.label),
          centerId: String(properties.centerId),
          latitude: Number(properties.latitude),
          longitude: Number(properties.longitude),
          heading: Number(properties.heading),
          speedKph: Number(properties.speedKph),
          status: properties.status,
          observedAt: String(properties.observedAt),
          isDemo: properties.isDemo === true || properties.isDemo === "true",
        },
      });
    });
    map.on("click", "waste-report-points", (event) => {
      const properties = event.features?.[0]?.properties;
      if (!properties || properties.cluster) return;
      setSelected({
        kind: "report",
        score: Number(properties.score),
        wasteType: String(properties.wasteType ?? "Waste report"),
        observedAt: String(properties.observedAt),
      });
    });
    map.on("click", "waste-clusters", (event) => {
      const feature = event.features?.[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      const coordinates = feature?.geometry.type === "Point" ? feature.geometry.coordinates : undefined;
      const source = map.getSource("waste-reports") as GeoJSONSource;
      if (!coordinates || !Number.isFinite(clusterId)) return;
      source.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (!error && zoom !== null && zoom !== undefined) {
          map.easeTo({ center: coordinates as [number, number], zoom });
        }
      });
    });

    for (const layer of ["center-points", "collector-points", "waste-report-points", "waste-clusters"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }

    return () => {
      abortRef.current?.abort();
      map.remove();
      mapRef.current = null;
    };
  }, [centers]);

  const loadWasteData = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const bounds = map.getBounds();
    if (!bounds) return;
    const params = new URLSearchParams({
      west: String(bounds.getWest()),
      south: String(bounds.getSouth()),
      east: String(bounds.getEast()),
      north: String(bounds.getNorth()),
      zoom: String(map.getZoom()),
      window: "30d",
    });
    setWasteLoading(true);
    setMapError("");

    try {
      const response = await fetch(`/api/map/waste?${params}`, { signal: controller.signal });
      const body = await response.json() as WasteMapResponse | { error?: string };
      if (!response.ok || !("mode" in body)) throw new Error("error" in body ? body.error : "Waste data is unavailable.");
      const densitySource = map.getSource("waste-density") as GeoJSONSource;
      const reportsSource = map.getSource("waste-reports") as GeoJSONSource;
      if (body.mode === "reports") {
        densitySource.setData(EMPTY_FEATURES);
        reportsSource.setData(body.data as Parameters<GeoJSONSource["setData"]>[0]);
      } else {
        reportsSource.setData(EMPTY_FEATURES);
        densitySource.setData(body.data as Parameters<GeoJSONSource["setData"]>[0]);
      }
      setWasteMode(body.mode);
      setWasteCount(body.data.features.length);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMapError(error instanceof Error ? error.message : "Waste density data is unavailable.");
      setWasteCount(0);
    } finally {
      if (!controller.signal.aborted) setWasteLoading(false);
    }
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleLoad = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void loadWasteData(), 250);
    };
    map.on("moveend", scheduleLoad);
    void loadWasteData();
    return () => {
      clearTimeout(timer);
      map.off("moveend", scheduleLoad);
    };
  }, [loadWasteData, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    setLayerVisibility(map, ["waste-heatmap", "waste-clusters", "waste-cluster-count", "waste-report-points"], showWaste);
    setLayerVisibility(map, ["center-halo", "center-points", "center-labels"], showCenters);
    setLayerVisibility(map, ["collector-points", "collector-direction"], showCollectors);
  }, [mapReady, showCenters, showCollectors, showWaste]);

  useEffect(() => {
    const source = mapRef.current?.getSource("collector-vehicles") as GeoJSONSource | undefined;
    if (source) source.setData(vehiclesToFeatureCollection(vehicles) as Parameters<GeoJSONSource["setData"]>[0]);
  }, [vehicles]);

  useEffect(() => {
    if (!demoMode) return;
    const startedAt = Date.now();
    const update = () => setVehicles(createDemoVehicles(Date.now() - startedAt));
    update();
    const interval = window.setInterval(update, 350);
    return () => window.clearInterval(interval);
  }, [demoMode]);

  useEffect(() => {
    if (demoMode || !HAS_SUPABASE_CONFIG) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase.channel("public-collector-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "collector_vehicle_locations" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = String(payload.old.vehicle_id ?? "");
          setVehicles((current) => current.filter((vehicle) => vehicle.vehicleId !== deletedId));
          return;
        }
        const row = payload.new;
        const vehicleId = String(row.vehicle_id);
        setVehicles((current) => {
          const existing = current.find((vehicle) => vehicle.vehicleId === vehicleId);
          if (!existing) return current;
          const next: CollectorVehicleLocation = {
            ...existing,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            heading: Number(row.heading),
            speedKph: Number(row.speed_kph),
            status: row.status,
            observedAt: String(row.observed_at),
          };
          return current.map((vehicle) => vehicle.vehicleId === vehicleId ? next : vehicle);
        });
      })
      .subscribe((status) => setRealtimeState(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : "connecting"));

    return () => { void supabase.removeChannel(channel); };
  }, [demoMode]);

  function focusCenter(center: RecyclingCenterMapItem) {
    setSelected({ kind: "center", center });
    mapRef.current?.flyTo({ center: [center.longitude, center.latitude], zoom: 15, essential: false });
  }

  function focusVehicle(vehicle: CollectorVehicleLocation) {
    setSelected({ kind: "vehicle", vehicle });
    mapRef.current?.flyTo({ center: [vehicle.longitude, vehicle.latitude], zoom: 15, essential: false });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser.");
      return;
    }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationMessage("Map centered on your location.");
        mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15, essential: false });
      },
      () => setLocationMessage("Location permission was denied. Recycling centers are still listed below."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function resetMap() {
    mapRef.current?.flyTo({ center: YANGON_CENTER, zoom: YANGON_ZOOM, bearing: 0, pitch: 0, essential: false });
    setSelected(null);
  }

  const visibleVehicles = vehicles.filter((vehicle) => getVehicleFreshness(vehicle.observedAt) !== "hidden");
  const densityLabel = wasteMode === "heatmap" ? "Heatmap" : "Report markers";

  const layerToggles = (
    <div className="map-layer-toggles" aria-label="Visible map layers">
      <button type="button" className={showWaste ? "is-active" : ""} onClick={() => setShowWaste((value) => !value)} aria-pressed={showWaste}><span className="map-layer-dot map-layer-dot--waste" />Waste density</button>
      <button type="button" className={showCenters ? "is-active" : ""} onClick={() => setShowCenters((value) => !value)} aria-pressed={showCenters}><Building2 size={16} />Centers</button>
      <button type="button" className={showCollectors ? "is-active" : ""} onClick={() => setShowCollectors((value) => !value)} aria-pressed={showCollectors}><CarFront size={16} />Collectors</button>
    </div>
  );

  const mapSummary = (
    <div className="map-panel-summary" aria-live="polite">
      <span><Layers3 size={15} aria-hidden="true" />{wasteLoading ? "Updating density…" : `${densityLabel} · ${wasteCount} visible`}</span>
      <span><CarFront size={15} aria-hidden="true" />{visibleVehicles.length} collectors</span>
    </div>
  );

  const centerList = (
    <div className="map-center-list">
      <div><strong>Recycling centers</strong><span>{centers.length} nearby</span></div>
      {centers.length ? centers.map((center) => (
        <button type="button" key={center.id} onClick={() => focusCenter(center)}>
          <span><Recycle size={17} /></span><div><strong>{center.name}</strong><small>{center.township} · {center.hours}</small></div><ChevronRight size={16} />
        </button>
      )) : <p>No active recycling centers are available for this map view yet.</p>}
    </div>
  );

  const collectorList = (
    <div className="map-center-list">
      <div><strong>Active collectors</strong><span>{visibleVehicles.length} nearby</span></div>
      {visibleVehicles.length ? visibleVehicles.map((vehicle) => (
        <button type="button" key={vehicle.vehicleId} onClick={() => focusVehicle(vehicle)}>
          <span><CarFront size={18} aria-hidden="true" /></span>
          <div>
            <strong>{vehicle.label}</strong>
            <small>{vehicle.status.replaceAll("_", " ")} · {formatUpdatedAt(vehicle.observedAt)}</small>
          </div>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      )) : <p>No active collectors are visible right now. Check again shortly.</p>}
    </div>
  );

  return (
    <main className={mobileSheetOpen ? "live-map-page is-mobile-sheet-open" : "live-map-page"} aria-label="Yangon live waste and recycling map">
      <div className="live-map-canvas" role="region" aria-label="Interactive Mapbox map of Yangon">
        <div className="live-map-canvas__map" ref={mapContainerRef} />
        {mapUnavailable ? (
          <div className="live-map-fallback">
            <MapPin size={34} aria-hidden="true" />
            <h1>Map view unavailable</h1>
            <p>Add a Mapbox public token to enable the interactive map. Partner center details remain available.</p>
          </div>
        ) : null}
      </div>

      <aside className="live-map-panel" aria-label="Map layers and recycling centers">
        <div className="live-map-panel__heading">
          <div><span>Yangon network</span><h1>Waste & recycling</h1></div>
          <span className={realtimeState === "live" ? "map-live-status is-live" : "map-live-status"}>{realtimeState === "live" ? <Signal size={14} /> : <SignalZero size={14} />}{demoMode ? "Demo live" : realtimeState === "live" ? "Live" : realtimeState}</span>
        </div>

        {layerToggles}
        {mapSummary}
        {centerList}
      </aside>

      <div className="live-map-actions" aria-label="Map actions">
        <Link href="/impact" aria-label="Open impact dashboard"><CircleGauge size={18} /><span>Impact dashboard</span></Link>
        <button type="button" onClick={useMyLocation} aria-label="Use my location"><LocateFixed size={19} /><span>My location</span></button>
        <button type="button" onClick={resetMap} aria-label="Reset Yangon view"><RotateCcw size={18} /><span>Reset Yangon view</span></button>
      </div>

      {isMobileMap ? (
        <Drawer
          modal={false}
          open={mobileSheetOpen}
          onOpenChange={(open) => setMobileSheetOpen(open)}
          showSwipeHandle
        >
          {!mobileSheetOpen ? (
            <DrawerTrigger className="live-map-sheet-trigger">
              <PanelBottomOpen size={19} aria-hidden="true" />
              Map controls
            </DrawerTrigger>
          ) : null}
          <DrawerContent className="live-map-mobile-sheet">
            <div className="live-map-mobile-sheet__heading">
              <div>
                <span>Yangon network</span>
                <DrawerTitle className="live-map-mobile-sheet__title">Yangon Network</DrawerTitle>
                <DrawerDescription className="sr-only">Browse recycling centers and active collector cars on the live Yangon map.</DrawerDescription>
              </div>
              <div className="live-map-mobile-sheet__heading-actions">
                <span className={realtimeState === "live" ? "map-live-status is-live" : "map-live-status"}>{realtimeState === "live" ? <Signal size={14} /> : <SignalZero size={14} />}{demoMode ? "Demo live" : realtimeState === "live" ? "Live" : realtimeState}</span>
                <DrawerClose className="live-map-mobile-sheet__close" aria-label="Close map controls">
                  <X size={19} aria-hidden="true" />
                </DrawerClose>
              </div>
            </div>
            <section
              className="live-map-mobile-sheet__content"
              id="mobile-map-panel-content"
              aria-label={`${MOBILE_PANEL_TABS.find((tab) => tab.value === mobilePanelTab)?.label ?? "Map"} panel`}
            >
              {mobilePanelTab === "centers" ? centerList : null}
              {mobilePanelTab === "collectors" ? collectorList : null}
            </section>
            <nav className="live-map-panel-tabs" aria-label="Map panel sections">
              {MOBILE_PANEL_TABS.map(({ value, label, Icon }) => (
                <button
                  className={mobilePanelTab === value ? "is-active" : ""}
                  type="button"
                  key={value}
                  aria-pressed={mobilePanelTab === value}
                  aria-controls="mobile-map-panel-content"
                  onClick={() => setMobilePanelTab(value)}
                >
                  <span className="live-map-panel-tabs__icon"><Icon size={21} aria-hidden="true" /></span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </DrawerContent>
        </Drawer>
      ) : null}

      {selected ? (
        <article className="map-selection" aria-live="polite">
          <button type="button" onClick={() => setSelected(null)} aria-label="Close map details"><X size={17} /></button>
          {selected.kind === "center" ? <><span className="map-selection__type"><Building2 size={15} />Partner center</span><h2>{selected.center.name}</h2><p>{selected.center.address}, {selected.center.township}</p><small>{selected.center.hours}</small><div className="map-selection__tags">{selected.center.materials.slice(0, 5).map((material) => <span key={material}>{material.replaceAll("-", " ")}</span>)}</div><a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.center.latitude},${selected.center.longitude}`} target="_blank" rel="noreferrer"><Navigation size={16} />Get directions</a></> : null}
          {selected.kind === "vehicle" ? <><span className="map-selection__type"><CarFront size={15} />{selected.vehicle.isDemo ? "Demo collector" : "Live collector"}</span><h2>{selected.vehicle.label}</h2><p>{selected.vehicle.status.replaceAll("_", " ")} · {Math.round(selected.vehicle.speedKph)} km/h</p><small>{formatUpdatedAt(selected.vehicle.observedAt)}</small></> : null}
          {selected.kind === "report" ? <><span className="map-selection__type"><AlertTriangle size={15} />Community report</span><h2>{selected.wasteType.replaceAll("_", " ")}</h2><p>Waste density score {selected.score} out of 10</p><small>Approximate location · {new Date(selected.observedAt).toLocaleDateString("en-US", { timeZone: "Asia/Yangon" })}</small></> : null}
        </article>
      ) : null}

      <section className="map-legend" aria-label="Waste density legend">
        <strong>Waste density</strong><span className="map-legend__ramp" aria-hidden="true" /><div><span>Lower</span><span>Higher</span></div><small>{wasteMode === "heatmap" ? "City overview" : "Approximate reports"}</small>
      </section>

      {mapError ? <div className="map-notice map-notice--error" role="alert"><AlertTriangle size={17} />{mapError}</div> : null}
      {locationMessage ? <div className="map-notice" role="status"><LocateFixed size={17} />{locationMessage}<button type="button" onClick={() => setLocationMessage("")} aria-label="Dismiss location message"><X size={15} /></button></div> : null}
    </main>
  );
}
