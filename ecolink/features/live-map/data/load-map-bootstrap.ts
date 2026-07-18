import "server-only";

import type { CollectorVehicleLocation, RecyclingCenterMapItem } from "@/features/live-map/types";
import { PARTNER_CENTERS } from "@/lib/ecolink-data";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface LiveMapBootstrap {
  centers: RecyclingCenterMapItem[];
  vehicles: CollectorVehicleLocation[];
  demoMode: boolean;
}

type RecyclingCenterRow = Pick<
  Database["public"]["Tables"]["recycling_centers"]["Row"],
  "id" | "name" | "township" | "address" | "opening_hours" | "latitude" | "longitude" | "accepted_materials"
>;
type CollectorVehicleRow = Pick<
  Database["public"]["Tables"]["collector_vehicles"]["Row"],
  "id" | "center_id" | "public_label"
>;
type CollectorVehicleLocationRow = Pick<
  Database["public"]["Tables"]["collector_vehicle_locations"]["Row"],
  "vehicle_id" | "latitude" | "longitude" | "heading" | "speed_kph" | "status" | "observed_at"
>;

function demoCenters(): RecyclingCenterMapItem[] {
  return PARTNER_CENTERS.map((center) => ({
    id: center.id,
    name: center.name,
    township: center.township,
    address: center.address,
    hours: center.hours,
    latitude: center.latitude,
    longitude: center.longitude,
    materials: [...center.materials],
  }));
}

export async function loadLiveMapBootstrap(): Promise<LiveMapBootstrap> {
  const demoMode = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE !== "false";
  if (demoMode) return { centers: demoCenters(), vehicles: [], demoMode: true };

  try {
    const supabase = await createSupabaseServerClient();
    const [centersResult, vehiclesResult, locationsResult] = await Promise.all([
      supabase.from("recycling_centers")
        .select("id,name,township,address,opening_hours,latitude,longitude,accepted_materials")
        .eq("is_active", true)
        .order("name"),
      supabase.from("collector_vehicles")
        .select("id,center_id,public_label")
        .eq("is_active", true)
        .eq("is_public", true),
      supabase.from("collector_vehicle_locations")
        .select("vehicle_id,latitude,longitude,heading,speed_kph,status,observed_at"),
    ]);

    if (centersResult.error) throw centersResult.error;
    if (vehiclesResult.error) throw vehiclesResult.error;
    if (locationsResult.error) throw locationsResult.error;

    const centerRows = (centersResult.data ?? []) as RecyclingCenterRow[];
    const vehicleRows = (vehiclesResult.data ?? []) as CollectorVehicleRow[];
    const locationRows = (locationsResult.data ?? []) as CollectorVehicleLocationRow[];

    const vehiclesById = new Map(vehicleRows.map((vehicle) => [vehicle.id, vehicle]));
    const vehicles: CollectorVehicleLocation[] = locationRows.flatMap((location) => {
      const vehicle = vehiclesById.get(location.vehicle_id);
      if (!vehicle) return [];
      return [{
        vehicleId: location.vehicle_id,
        label: vehicle.public_label,
        centerId: vehicle.center_id,
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speedKph: location.speed_kph,
        status: location.status,
        observedAt: location.observed_at,
      }];
    });

    return {
      demoMode: false,
      centers: centerRows.map((center) => ({
        id: center.id,
        name: center.name,
        township: center.township,
        address: center.address,
        hours: center.opening_hours,
        latitude: center.latitude,
        longitude: center.longitude,
        materials: center.accepted_materials,
      })),
      vehicles,
    };
  } catch (error) {
    console.error("Live map bootstrap failed", error);
    return { centers: [], vehicles: [], demoMode: false };
  }
}
