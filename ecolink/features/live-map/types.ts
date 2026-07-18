export type WasteMapMode = "heatmap" | "reports";
export type WasteWindow = "24h" | "7d" | "30d";

export type WasteType =
  | "MIXED"
  | "PLASTIC"
  | "PAPER_CARDBOARD"
  | "METAL"
  | "GLASS"
  | "ORGANIC"
  | "E_WASTE"
  | "HAZARDOUS"
  | "OTHER";

export interface MapPointGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface MapPolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export type MapGeometry = MapPointGeometry | MapPolygonGeometry;

export interface MapFeature<Properties extends Record<string, unknown> = Record<string, unknown>> {
  type: "Feature";
  id?: string;
  geometry: MapGeometry;
  properties: Properties;
}

export interface MapFeatureCollection<Properties extends Record<string, unknown> = Record<string, unknown>> {
  type: "FeatureCollection";
  features: Array<MapFeature<Properties>>;
}

export interface WasteMapResponse {
  mode: WasteMapMode;
  data: MapFeatureCollection;
  generatedAt: string;
}

export interface RecyclingCenterMapItem {
  id: string;
  name: string;
  township: string;
  address: string;
  hours: string;
  latitude: number;
  longitude: number;
  materials: string[];
}

export type CollectorStatus = "collecting" | "en_route" | "returning" | "offline";

export interface CollectorVehicleLocation {
  vehicleId: string;
  label: string;
  centerId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speedKph: number;
  status: CollectorStatus;
  observedAt: string;
  isDemo?: boolean;
}

export interface WasteMapRpcRow {
  mode: string;
  feature_id: string;
  geometry: MapGeometry;
  properties: Record<string, unknown>;
}
