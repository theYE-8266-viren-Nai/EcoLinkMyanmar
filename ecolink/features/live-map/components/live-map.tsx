"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Layers3,
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  PanelBottomOpen,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import mapboxgl, {
  type GeoJSONSource,
  type LightSpecification,
  type Map as MapboxMap,
  type StyleSpecification,
} from "mapbox-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createDemoCollectorRoutes,
  createDemoVehicles,
  DEMO_COLLECTOR_ROUTES,
} from "@/features/live-map/data/demo-map-data";
import type { LiveMapBootstrap } from "@/features/live-map/data/load-map-bootstrap";
import type {
  CollectorVehicleLocation,
  CollectorRoute,
  MapFeatureCollection,
  RecyclingCenterMapItem,
  WasteMapResponse,
} from "@/features/live-map/types";
import {
  getVehicleFreshness,
  routesToFeatureCollection,
  vehiclesToFeatureCollection,
  YANGON_BOUNDS,
  YANGON_CENTER,
  YANGON_ZOOM,
} from "@/features/live-map/utils/map-data";
import { useI18n } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const EMPTY_FEATURES: MapFeatureCollection = { type: "FeatureCollection", features: [] };
const MAP_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
  ?? "mapbox://styles/happer64bit/clnpqzscu00dj01qqhgrkhawy";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const HAS_SUPABASE_CONFIG = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);
const mapFilterChipSx = {
  height: 32,
  fontWeight: 700,
  fontSize: "0.72rem",
  "& .MuiChip-label": { px: 1, display: "flex", alignItems: "center" },
  "& .MuiChip-icon": { width: 15, height: 15, ml: 0.9, mr: -0.2, flexShrink: 0 },
} as const;

type SelectedMapItem =
  | { kind: "center"; center: RecyclingCenterMapItem }
  | { kind: "vehicle"; vehicle: CollectorVehicleLocation }
  | { kind: "report"; score: number; wasteType: string; observedAt: string }
  | null;

type MobilePanelTab = "centers" | "collectors";

type MapboxDirectionsResponse = {
  routes?: Array<{ geometry?: { coordinates?: unknown } }>;
};

type DeprecatedLightStyle = StyleSpecification & {
  light?: LightSpecification;
};

function normalizeMapStyleLights(style: StyleSpecification): StyleSpecification {
  const styleWithDeprecatedLight = style as DeprecatedLightStyle;
  if (!styleWithDeprecatedLight.light) return style;
  const { light, ...styleWithoutLight } = styleWithDeprecatedLight;
  return {
    ...styleWithoutLight,
    lights: style.lights ?? [{ id: "ecolink-flat-light", type: "flat", properties: light }],
  };
}

function mapboxStyleApiUrl(styleUrl: string, accessToken: string) {
  if (!styleUrl.startsWith("mapbox://styles/")) return styleUrl;
  const stylePath = styleUrl.slice("mapbox://styles/".length);
  const apiUrl = new URL(`https://api.mapbox.com/styles/v1/${stylePath}`);
  apiUrl.searchParams.set("access_token", accessToken);
  return apiUrl.toString();
}

async function resolveMapStyle(styleUrl: string, accessToken: string, signal: AbortSignal) {
  const response = await fetch(mapboxStyleApiUrl(styleUrl, accessToken), { signal });
  if (!response.ok) throw new Error("Map style could not be loaded.");
  return normalizeMapStyleLights(await response.json() as StyleSpecification);
}

function isRouteCoordinates(value: unknown): value is [number, number][] {
  return Array.isArray(value) && value.length >= 2 && value.every((coordinate) =>
    Array.isArray(coordinate)
    && coordinate.length === 2
    && coordinate.every((part) => typeof part === "number" && Number.isFinite(part)));
}

async function loadRoadRoute(route: typeof DEMO_COLLECTOR_ROUTES[number], signal: AbortSignal) {
  if (!MAPBOX_TOKEN) return route.route;
  const coordinates = [...route.route, route.route[0]].map(([longitude, latitude]) => `${longitude},${latitude}`).join(";");
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?geometries=geojson&overview=full&continue_straight=true&access_token=${MAPBOX_TOKEN}`,
    { signal },
  );
  if (!response.ok) throw new Error("Road directions could not be loaded.");
  const body = await response.json() as MapboxDirectionsResponse;
  const routeCoordinates = body.routes?.[0]?.geometry?.coordinates;
  if (!isRouteCoordinates(routeCoordinates)) throw new Error("Road directions returned an invalid geometry.");
  return routeCoordinates;
}

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

function formatUpdatedAt(value: string, t: ReturnType<typeof useI18n>["t"]) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return t("map.updatedNow");
  if (seconds < 60) return t("map.updatedSeconds", { count: seconds });
  return t("map.updatedMinutes", { count: Math.floor(seconds / 60) });
}

async function addCollectorVehicleIcons(map: MapboxMap) {
  const images = [
    { id: "recycle-car", path: "/recycle-car.svg", sdf: false },
    { id: "recycling-center-glyph", path: "/map-recycling-center.svg", sdf: true },
    { id: "waste-report-glyph", path: "/map-waste-report.svg", sdf: true },
  ];

  await Promise.all(images.map(async ({ id, path, sdf }) => {
    if (map.hasImage(id)) return;
    const image = new Image();
    image.src = path;
    await image.decode();
    map.addImage(id, image, { pixelRatio: 2, sdf });
  }));
}

async function addMapSourcesAndLayers(map: MapboxMap, centers: RecyclingCenterMapItem[]) {
  await addCollectorVehicleIcons(map);
  map.addSource("waste-density", { type: "geojson", data: EMPTY_FEATURES });
  map.addSource("waste-reports", {
    type: "geojson",
    data: EMPTY_FEATURES,
    cluster: true,
    clusterMaxZoom: 16,
    clusterRadius: 48,
  });
  map.addSource("recycling-centers", { type: "geojson", data: centersToFeatureCollection(centers) });
  map.addSource("collector-routes", { type: "geojson", data: EMPTY_FEATURES });
  map.addSource("collector-vehicles", { type: "geojson", data: EMPTY_FEATURES });

  map.addLayer({
    id: "waste-heatmap",
    type: "heatmap",
    source: "waste-density",
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["*", ["get", "count"], ["get", "averageScore"]], 1, 0.12, 40, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.7, 12, 1.8, 16, 1.35],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 12, 42, 16, 58],
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(8,124,120,0)",
        0.2, "rgba(44,150,137,0.45)",
        0.45, "rgba(244,194,74,0.68)",
        0.7, "rgba(238,126,62,0.82)",
        1, "rgba(184,55,72,0.94)",
      ],
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.88, 12, 0.72, 16, 0.42],
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
    id: "waste-report-icons",
    type: "symbol",
    source: "waste-reports",
    minzoom: 12,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": "waste-report-glyph",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 15, 0.5, 18, 0.72],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-color": "#ffffff" },
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
    id: "center-icons",
    type: "symbol",
    source: "recycling-centers",
    layout: {
      "icon-image": "recycling-center-glyph",
      "icon-size": 0.58,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
    paint: { "icon-color": "#ffffff" },
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
    id: "collector-route-casing",
    type: "line",
    source: "collector-routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "rgba(255,255,255,0.9)", "line-width": 6, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "collector-route-dots",
    type: "line",
    source: "collector-routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "routeColor"],
      "line-width": 3,
      "line-opacity": 0.9,
      "line-dasharray": [0.5, 1.5],
    },
  });

  map.addLayer({
    id: "collector-vehicle-icons",
    type: "symbol",
    source: "collector-vehicles",
    layout: {
      "icon-image": ["coalesce", ["get", "vehicleIcon"], "recycle-car"],
      "icon-size": 0.4,
      "icon-rotate": ["+", ["get", "heading"], 90],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
}

export function LiveMap({ centers, vehicles: initialVehicles, demoMode }: LiveMapBootstrap) {
  const { t } = useI18n();
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState<MobilePanelTab>("centers");
  const [selected, setSelected] = useState<SelectedMapItem>(null);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [collectorRoutes, setCollectorRoutes] = useState<CollectorRoute[]>(() => createDemoCollectorRoutes());
  const roadRoutesRef = useRef<Map<string, readonly [number, number][]>>(new Map());
  const [locationMessage, setLocationMessage] = useState("");

  const visibleVehicles = vehicles.filter((vehicle) => {
    const freshness = getVehicleFreshness(vehicle.observedAt);
    return freshness !== "hidden";
  });

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return;
    let disposed = false;
    const styleController = new AbortController();
    mapContainerRef.current.replaceChildren();
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const interactiveLayers = ["center-points", "collector-vehicle-icons", "waste-report-points", "waste-clusters"];

    void resolveMapStyle(MAP_STYLE, MAPBOX_TOKEN, styleController.signal)
      .then((style) => {
        if (disposed || !mapContainerRef.current) return;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style,
          center: YANGON_CENTER,
          zoom: YANGON_ZOOM,
          minZoom: 9,
          maxZoom: 19,
          maxBounds: YANGON_BOUNDS,
          attributionControl: false,
          cooperativeGestures: false,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: false }), "bottom-right");

        const handleLoad = () => {
          void addMapSourcesAndLayers(map, centers)
            .then(() => {
              setMapReady(true);
              setMapUnavailable(false);
            })
            .catch(() => {
              setMapError(t("map.errorIcons"));
            });
        };
        const handleError = (event: mapboxgl.ErrorEvent) => {
          console.error("Mapbox rendering error", event.error);
          setMapError(t("map.errorBasemap"));
        };

        const handleCenterClick = (event: mapboxgl.MapLayerMouseEvent) => {
          const id = String(event.features?.[0]?.properties?.id ?? "");
          const center = centers.find((item) => item.id === id);
          if (center) setSelected({ kind: "center", center });
        };
        const handleCollectorClick = (event: mapboxgl.MapLayerMouseEvent) => {
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
              vehicleIcon: String(properties.vehicleIcon ?? "recycle-car"),
            },
          });
        };
        const handleWasteReportClick = (event: mapboxgl.MapLayerMouseEvent) => {
          const properties = event.features?.[0]?.properties;
          if (!properties || properties.cluster) return;
          setSelected({
            kind: "report",
            score: Number(properties.score),
            wasteType: String(properties.wasteType ?? "Waste report"),
            observedAt: String(properties.observedAt),
          });
        };
        const handleWasteClusterClick = (event: mapboxgl.MapLayerMouseEvent) => {
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
        };
        const handleLayerMouseEnter = () => { map.getCanvas().style.cursor = "pointer"; };
        const handleLayerMouseLeave = () => { map.getCanvas().style.cursor = ""; };

        map.on("load", handleLoad);
        map.on("error", handleError);
        map.on("click", "center-points", handleCenterClick);
        map.on("click", "collector-vehicle-icons", handleCollectorClick);
        map.on("click", "waste-report-points", handleWasteReportClick);
        map.on("click", "waste-clusters", handleWasteClusterClick);

        for (const layer of interactiveLayers) {
          map.on("mouseenter", layer, handleLayerMouseEnter);
          map.on("mouseleave", layer, handleLayerMouseLeave);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Mapbox style load failed", error);
        setMapError(t("map.errorBasemap"));
        setMapUnavailable(true);
      });

    return () => {
      disposed = true;
      styleController.abort();
      abortRef.current?.abort();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [centers, t]);

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
      if (!response.ok || !("mode" in body)) throw new Error("error" in body ? body.error : t("map.errorWaste"));
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
      setMapError(error instanceof Error ? error.message : t("map.errorDensity"));
      setWasteCount(0);
    } finally {
      if (!controller.signal.aborted) setWasteLoading(false);
    }
  }, [mapReady, t]);

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
    setLayerVisibility(map, ["waste-clusters", "waste-cluster-count", "waste-report-points", "waste-report-icons"], showWaste);
    setLayerVisibility(map, ["center-halo", "center-points", "center-icons", "center-labels"], showCenters);
    setLayerVisibility(map, ["collector-route-casing", "collector-route-dots", "collector-vehicle-icons"], showCollectors);
  }, [mapReady, showCenters, showCollectors, showWaste]);

  useEffect(() => {
    const source = mapRef.current?.getSource("collector-vehicles") as GeoJSONSource | undefined;
    if (source) source.setData(vehiclesToFeatureCollection(vehicles) as Parameters<GeoJSONSource["setData"]>[0]);
  }, [mapReady, vehicles]);

  useEffect(() => {
    const source = mapRef.current?.getSource("collector-routes") as GeoJSONSource | undefined;
    if (source) source.setData(routesToFeatureCollection(collectorRoutes) as Parameters<GeoJSONSource["setData"]>[0]);
  }, [collectorRoutes, mapReady]);

  useEffect(() => {
    if (!demoMode || !MAPBOX_TOKEN) return;
    const controller = new AbortController();

    void Promise.all(DEMO_COLLECTOR_ROUTES.map(async (route) => {
      try {
        return [route.vehicleId, await loadRoadRoute(route, controller.signal)] as const;
      } catch {
        return [route.vehicleId, route.route] as const;
      }
    })).then((routes) => {
      if (controller.signal.aborted) return;
      roadRoutesRef.current = new Map(routes);
      setCollectorRoutes(createDemoCollectorRoutes(roadRoutesRef.current));
    });

    return () => controller.abort();
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    const startedAt = Date.now();
    let animationFrame = 0;
    let lastPanelUpdate = 0;

    const update = (timestamp: number) => {
      const nextVehicles = createDemoVehicles(Date.now() - startedAt, new Date(), roadRoutesRef.current);
      const source = mapRef.current?.getSource("collector-vehicles") as GeoJSONSource | undefined;
      if (source) source.setData(vehiclesToFeatureCollection(nextVehicles) as Parameters<GeoJSONSource["setData"]>[0]);

      if (timestamp - lastPanelUpdate >= 1000) {
        lastPanelUpdate = timestamp;
        setVehicles(nextVehicles);
      }

      animationFrame = window.requestAnimationFrame(update);
    };

    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
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
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [demoMode]);

  function focusCenter(center: RecyclingCenterMapItem) {
    setSelected({ kind: "center", center });
    setMobileSheetOpen(false);
    mapRef.current?.flyTo({ center: [center.longitude, center.latitude], zoom: 15, essential: false });
  }

  function focusVehicle(vehicle: CollectorVehicleLocation) {
    setSelected({ kind: "vehicle", vehicle });
    setMobileSheetOpen(false);
    mapRef.current?.flyTo({ center: [vehicle.longitude, vehicle.latitude], zoom: 15, essential: false });
  }

  function resetMap() {
    setSelected(null);
    mapRef.current?.flyTo({ center: YANGON_CENTER, zoom: YANGON_ZOOM, bearing: 0, pitch: 0 });
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage(t("map.locationUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: [number, number] = [position.coords.longitude, position.coords.latitude];
        mapRef.current?.flyTo({ center: coordinates, zoom: 15 });
        setLocationMessage("");
      },
      () => setLocationMessage(t("map.locationError"))
    );
  }

  const densityLabel = wasteMode === "heatmap" ? t("map.heatmap") : t("map.reportMarkers");
  const bottomNavOffset = "calc(var(--ecolink-bottom-nav-clearance, 64px) + 12px)";
  const selectedCardOffset = "calc(var(--ecolink-bottom-nav-clearance, 64px) + 156px)";
  const mapEdgeLeft = "calc(12px + var(--ecolink-safe-area-left, 0px))";
  const mapEdgeRight = "calc(12px + var(--ecolink-safe-area-right, 0px))";

  return (
    <Box className="live-map-canvas" sx={{ position: "relative", width: "100%", height: "100%", display: "flex", flexGrow: 1 }}>
      {/* Map Canvas */}
      <Box sx={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
        <Box ref={mapContainerRef} sx={{ width: "100%", height: "100%" }} />
        {mapUnavailable && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(228, 236, 238, 0.95)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
              textAlign: "center",
              zIndex: 2,
            }}
          >
            <MapPin size={48} color="#087c78" style={{ marginBottom: 16 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "secondary.main" }}>
              {t("map.viewUnavailable")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 300 }}>
              {t("map.tokenHelp")}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Floating Layer Controls (Top Left) */}
      <Stack
        spacing={1}
        sx={{
          position: "absolute",
          top: 12,
          left: mapEdgeLeft,
          zIndex: 10,
          maxWidth: "calc(100% - 24px - var(--ecolink-safe-area-left, 0px) - var(--ecolink-safe-area-right, 0px))",
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 0.5,
            borderRadius: "20px",
            bgcolor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(4px)",
          }}
        >
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Chip
              onClick={() => setShowWaste((val) => !val)}
              variant={showWaste ? "filled" : "outlined"}
              color={showWaste ? "error" : "default"}
              size="small"
              icon={<MapPinned size={15} strokeWidth={2.2} />}
              label={t("map.reports")}
              sx={mapFilterChipSx}
            />
            <Chip
              onClick={() => setShowCenters((val) => !val)}
              variant={showCenters ? "filled" : "outlined"}
              color={showCenters ? "primary" : "default"}
              size="small"
              icon={<Building2 size={15} strokeWidth={2.2} />}
              label={t("map.centers")}
              sx={mapFilterChipSx}
            />
            <Chip
              onClick={() => setShowCollectors((val) => !val)}
              variant={showCollectors ? "filled" : "outlined"}
              color={showCollectors ? "secondary" : "default"}
              size="small"
              icon={<Truck size={15} strokeWidth={2.2} />}
              label={t("map.collectors")}
              sx={mapFilterChipSx}
            />
          </Stack>
        </Paper>

        <Paper
          elevation={1}
          sx={{
            py: 0.5,
            px: 1.5,
            borderRadius: "12px",
            bgcolor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(4px)",
            width: "fit-content",
          }}
        >
          <Typography variant="caption" sx={{ fontSize: "0.65rem", display: "flex", gap: 1, alignItems: "center", color: "text.secondary" }}>
            <Layers3 size={11} />
            {wasteLoading ? t("map.loadingShort") : t("map.densityLabel", { mode: densityLabel, count: wasteCount })}
          </Typography>
        </Paper>
      </Stack>

      {/* Floating Utilities (Right Side, mid-screen) */}
      <Stack
        spacing={1}
        sx={{
          position: "absolute",
          top: "30%",
          right: mapEdgeRight,
          zIndex: 10,
        }}
      >
        <Paper elevation={3} sx={{ borderRadius: "50%", overflow: "hidden" }}>
          <IconButton
            onClick={useMyLocation}
            aria-label={t("map.useLocation")}
            sx={{ bgcolor: "background.paper", color: "secondary.main", width: 44, height: 44 }}
          >
            <LocateFixed size={20} />
          </IconButton>
        </Paper>
        <Paper elevation={3} sx={{ borderRadius: "50%", overflow: "hidden" }}>
          <IconButton
            onClick={resetMap}
            aria-label={t("map.reset")}
            sx={{ bgcolor: "background.paper", color: "secondary.main", width: 44, height: 44 }}
          >
            <RotateCcw size={20} />
          </IconButton>
        </Paper>
        <Paper elevation={3} sx={{ borderRadius: "50%", overflow: "hidden" }}>
          <IconButton
            onClick={() => setMobileSheetOpen(true)}
            aria-label={t("map.openPanel")}
            sx={{ bgcolor: "primary.main", color: "white", width: 44, height: 44, "&:hover": { bgcolor: "primary.dark" } }}
          >
            <PanelBottomOpen size={20} />
          </IconButton>
        </Paper>
      </Stack>

      {/* Map Legend (Bottom Right, sits above Bottom Sheet) */}
      <Paper
        elevation={1}
        sx={{
          position: "absolute",
          bottom: selected ? selectedCardOffset : bottomNavOffset,
          left: mapEdgeLeft,
          zIndex: 9,
          p: 1,
          borderRadius: "8px",
          bgcolor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(4px)",
          fontSize: "0.65rem",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          width: 100,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.62rem" }}>
          {t("map.wasteDensity")}
        </Typography>
        <Box
          sx={{
            height: 6,
            borderRadius: 1,
            background: "linear-gradient(90deg, rgba(8,124,120,0) 0%, rgba(44,150,137,0.45) 20%, rgba(244,194,74,0.68) 50%, rgba(238,126,62,0.82) 80%, rgba(184,55,72,0.94) 100%)",
          }}
        />
        <Stack direction="row" sx={{ justifyContent: "space-between", color: "text.secondary" }}>
          <span>{t("map.low")}</span>
          <span>{t("map.high")}</span>
        </Stack>
      </Paper>

      {/* Selected Item Detail Card */}
      {selected && (
        <Card
          elevation={4}
          sx={{
            position: "absolute",
            bottom: bottomNavOffset,
            left: mapEdgeLeft,
            right: mapEdgeRight,
            zIndex: 15,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            maxHeight: "min(44dvh, 260px)",
            overflowY: "auto",
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                {selected.kind === "center" && (
                  <>
                    <Chip size="small" icon={<Building2 size={12} />} label={t("map.partnerCenter")} color="primary" sx={{ mb: 1, height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>{selected.center.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selected.center.address}, {selected.center.township}</Typography>
                    <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.5, fontWeight: 700 }}>{selected.center.hours}</Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 1.5, flexWrap: "wrap" }}>
                      {selected.center.materials.slice(0, 4).map((m) => (
                        <Chip key={m} size="small" label={m.replaceAll("-", " ")} sx={{ fontSize: "0.62rem", height: 18 }} />
                      ))}
                    </Stack>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Navigation size={14} />}
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selected.center.latitude},${selected.center.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ mt: 2, minHeight: 38 }}
                    >
                      {t("map.getDirections")}
                    </Button>
                  </>
                )}
                {selected.kind === "vehicle" && (
                  <>
                    <Chip size="small" icon={<Truck size={12} />} label={selected.vehicle.isDemo ? t("map.demoCollector") : t("map.liveCollector")} color="secondary" sx={{ mb: 1, height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>{selected.vehicle.label}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t("map.status", { status: selected.vehicle.status.replaceAll("_", " ") })}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {t("map.heading", { speed: Math.round(selected.vehicle.speedKph), updated: formatUpdatedAt(selected.vehicle.observedAt, t) })}
                    </Typography>
                  </>
                )}
                {selected.kind === "report" && (
                  <>
                    <Chip size="small" icon={<AlertTriangle size={12} />} label={t("map.communityWasteReport")} color="error" sx={{ mb: 1, height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>{selected.wasteType.replaceAll("_", " ")}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t("map.densityScore", { score: selected.score })}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {t("map.observed", { date: new Date(selected.observedAt).toLocaleDateString("en-US", { timeZone: "Asia/Yangon" }) })}
                    </Typography>
                  </>
                )}
              </Box>
              <IconButton size="small" onClick={() => setSelected(null)}>
                <X size={16} />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Absolute Bottom Sheet Panel (List of centers/collectors) */}
      <Paper
        elevation={4}
        sx={{
          position: "absolute",
          bottom: "var(--ecolink-bottom-nav-clearance, 64px)",
          left: "var(--ecolink-safe-area-left, 0px)",
          right: "var(--ecolink-safe-area-right, 0px)",
          zIndex: 20,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100% - var(--ecolink-bottom-nav-clearance, 64px) - 24px)",
          transform: mobileSheetOpen ? "translateY(0)" : "translateY(calc(100% + var(--ecolink-bottom-nav-clearance, 64px)))",
          transition: "transform 0.25s ease-out",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Drag handle block */}
        <Box
          onClick={() => setMobileSheetOpen(false)}
          sx={{
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <Box sx={{ width: 40, height: 4, bgcolor: "divider", borderRadius: 2, mb: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>{t("map.network")}</Typography>
        </Box>

        {/* Tab Controls */}
        <Tabs
          value={mobilePanelTab}
          onChange={(_, val: MobilePanelTab) => setMobilePanelTab(val)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab
            value="centers"
            icon={<Building2 size={16} style={{ marginBottom: 2 }} />}
            label={t("map.centersTab", { count: centers.length })}
            sx={{ fontWeight: 750, minHeight: 48, fontSize: "0.78rem" }}
          />
          <Tab
            value="collectors"
            icon={<Truck size={16} style={{ marginBottom: 2 }} />}
            label={t("map.collectorsTab", { count: visibleVehicles.length })}
            sx={{ fontWeight: 750, minHeight: 48, fontSize: "0.78rem" }}
          />
        </Tabs>

        {/* Scrollable list content */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "background.default", p: 1, minHeight: 120 }}>
          {mobilePanelTab === "centers" ? (
            <List disablePadding>
              {centers.length ? (
                centers.map((center) => (
                  <ListItemButton
                    key={center.id}
                    onClick={() => focusCenter(center)}
                    sx={{
                      mb: 0.75,
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <ListItemText
                      primary={center.name}
                      secondary={`${center.township} · ${center.hours}`}
                      slotProps={{
                        primary: { variant: "body2", sx: { fontWeight: 800 } },
                        secondary: { variant: "caption", color: "text.secondary" }
                      }}
                    />
                    <ChevronRight size={18} color="grey" />
                  </ListItemButton>
                ))
              ) : (
                <Typography variant="body2" align="center" color="text.secondary" sx={{ p: 3 }}>
                  {t("map.noCenters")}
                </Typography>
              )}
            </List>
          ) : (
            <List disablePadding>
              {visibleVehicles.length ? (
                visibleVehicles.map((vehicle) => (
                  <ListItemButton
                    key={vehicle.vehicleId}
                    onClick={() => focusVehicle(vehicle)}
                    sx={{
                      mb: 0.75,
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <ListItemText
                      primary={vehicle.label}
                      secondary={`${vehicle.status.replaceAll("_", " ")} · ${formatUpdatedAt(vehicle.observedAt, t)}`}
                      slotProps={{
                        primary: { variant: "body2", sx: { fontWeight: 800 } },
                        secondary: { variant: "caption", color: "text.secondary" }
                      }}
                    />
                    <ChevronRight size={18} color="grey" />
                  </ListItemButton>
                ))
              ) : (
                <Typography variant="body2" align="center" color="text.secondary" sx={{ p: 3 }}>
                  {t("map.noCollectors")}
                </Typography>
              )}
            </List>
          )}
        </Box>
      </Paper>

      {/* Floating notifications */}
      {locationMessage && (
        <Alert
          severity="info"
          onClose={() => setLocationMessage("")}
          sx={{
            position: "absolute",
            top: 76,
            left: mapEdgeLeft,
            right: mapEdgeRight,
            zIndex: 100,
            borderRadius: 2,
          }}
        >
          {locationMessage}
        </Alert>
      )}

      {mapError && (
        <Alert
          severity="warning"
          sx={{
            position: "absolute",
            top: 76,
            left: mapEdgeLeft,
            right: mapEdgeRight,
            zIndex: 100,
            borderRadius: 2,
          }}
        >
          {mapError}
        </Alert>
      )}
    </Box>
  );
}
