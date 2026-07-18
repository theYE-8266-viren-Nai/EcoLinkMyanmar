"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  CircleGauge,
  House,
  Layers3,
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  PanelBottomOpen,
  Recycle,
  RotateCcw,
  Truck,
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

type SelectedMapItem =
  | { kind: "center"; center: RecyclingCenterMapItem }
  | { kind: "vehicle"; vehicle: CollectorVehicleLocation }
  | { kind: "report"; score: number; wasteType: string; observedAt: string }
  | null;

type MobilePanelTab = "centers" | "collectors";

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
  if (map.hasImage("recycle-car")) return;
  const image = new Image();
  image.src = "/recycle-car.svg";
  await image.decode();
  map.addImage("recycle-car", image, { pixelRatio: 2 });
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
  const [locationMessage, setLocationMessage] = useState("");

  const visibleVehicles = vehicles.filter((vehicle) => {
    const freshness = getVehicleFreshness(vehicle.observedAt);
    return freshness !== "hidden";
  });

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
          vehicleIcon: String(properties.vehicleIcon ?? "🚚"),
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

    const interactiveLayers = ["center-points", "collector-vehicle-icons", "waste-report-points", "waste-clusters"];
    for (const layer of interactiveLayers) {
      map.on("mouseenter", layer, handleLayerMouseEnter);
      map.on("mouseleave", layer, handleLayerMouseLeave);
    }

    return () => {
      abortRef.current?.abort();
      map.off("load", handleLoad);
      map.off("error", handleError);
      map.off("click", "center-points", handleCenterClick);
      map.off("click", "collector-vehicle-icons", handleCollectorClick);
      map.off("click", "waste-report-points", handleWasteReportClick);
      map.off("click", "waste-clusters", handleWasteClusterClick);
      for (const layer of interactiveLayers) {
        map.off("mouseenter", layer, handleLayerMouseEnter);
        map.off("mouseleave", layer, handleLayerMouseLeave);
      }
      map.remove();
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
    setLayerVisibility(map, ["waste-clusters", "waste-cluster-count", "waste-report-points"], showWaste);
    setLayerVisibility(map, ["center-halo", "center-points", "center-labels"], showCenters);
    setLayerVisibility(map, ["collector-vehicle-icons"], showCollectors);
  }, [mapReady, showCenters, showCollectors, showWaste]);

  useEffect(() => {
    const source = mapRef.current?.getSource("collector-vehicles") as GeoJSONSource | undefined;
    if (source) source.setData(vehiclesToFeatureCollection(vehicles) as Parameters<GeoJSONSource["setData"]>[0]);
  }, [vehicles]);

  useEffect(() => {
    if (!demoMode) return;
    const startedAt = Date.now();
    let animationFrame = 0;
    let lastPanelUpdate = 0;

    const update = (timestamp: number) => {
      const nextVehicles = createDemoVehicles(Date.now() - startedAt);
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

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", flexGrow: 1 }}>
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
          left: 12,
          zIndex: 10,
          maxWidth: "calc(100% - 24px)",
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
          <Stack direction="row" spacing={0.5}>
            <Chip
              onClick={() => setShowWaste((val) => !val)}
              variant={showWaste ? "filled" : "outlined"}
              color={showWaste ? "error" : "default"}
              size="small"
              label={t("map.reports")}
              sx={{ fontWeight: 700, fontSize: "0.68rem" }}
            />
            <Chip
              onClick={() => setShowCenters((val) => !val)}
              variant={showCenters ? "filled" : "outlined"}
              color={showCenters ? "primary" : "default"}
              size="small"
              icon={<Building2 size={12} />}
              label={t("map.centers")}
              sx={{ fontWeight: 700, fontSize: "0.68rem" }}
            />
            <Chip
              onClick={() => setShowCollectors((val) => !val)}
              variant={showCollectors ? "filled" : "outlined"}
              color={showCollectors ? "secondary" : "default"}
              size="small"
              icon={<Truck size={12} />}
              label={t("map.collectors")}
              sx={{ fontWeight: 700, fontSize: "0.68rem" }}
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
          right: 12,
          zIndex: 10,
        }}
      >
        <Paper elevation={3} sx={{ borderRadius: "50%", overflow: "hidden" }}>
          <IconButton
            onClick={useMyLocation}
            aria-label={t("map.useLocation")}
            sx={{ bgcolor: "background.paper", color: "secondary.main", p: 1.25 }}
          >
            <LocateFixed size={20} />
          </IconButton>
        </Paper>
        <Paper elevation={3} sx={{ borderRadius: "50%", overflow: "hidden" }}>
          <IconButton
            onClick={resetMap}
            aria-label={t("map.reset")}
            sx={{ bgcolor: "background.paper", color: "secondary.main", p: 1.25 }}
          >
            <RotateCcw size={20} />
          </IconButton>
        </Paper>
        <Paper elevation={3} sx={{ borderRadius: "50%", overflow: "hidden" }}>
          <IconButton
            onClick={() => setMobileSheetOpen(true)}
            aria-label={t("map.openPanel")}
            sx={{ bgcolor: "primary.main", color: "white", p: 1.25, "&:hover": { bgcolor: "primary.dark" } }}
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
          bottom: selected ? 220 : 76,
          right: 12,
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
            bottom: 76,
            left: 12,
            right: 12,
            zIndex: 15,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
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
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: "flex",
          flexDirection: "column",
          maxHeight: "75%",
          transform: mobileSheetOpen ? "translateY(0)" : "translateY(100%)",
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
            left: 12,
            right: 12,
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
            left: 12,
            right: 12,
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
