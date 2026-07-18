import { z } from "zod";

import { createDemoWasteResponse } from "@/features/live-map/data/demo-map-data";
import { wasteMapQuerySchema, wasteMapRpcRowsSchema, type WasteMapQuery } from "@/features/live-map/schemas/map";
import type { WasteMapRpcRow } from "@/features/live-map/types";
import { getObservedSince, rowsToWasteMapResponse } from "@/features/live-map/utils/map-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export interface WasteMapHandlerDependencies {
  demoMode?: boolean;
  loadRows?: (query: WasteMapQuery) => Promise<WasteMapRpcRow[]>;
  now?: () => Date;
}

async function loadWasteMapRows(query: WasteMapQuery, now: Date) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_waste_map", {
    min_lng: query.west,
    min_lat: query.south,
    max_lng: query.east,
    max_lat: query.north,
    requested_zoom: query.zoom,
    observed_since: getObservedSince(query.window, now),
    requested_waste_type: query.wasteType ?? null,
  });

  if (error) throw error;
  return wasteMapRpcRowsSchema.parse(data ?? []);
}

function validationError(error: z.ZodError) {
  return Response.json(
    { error: "The map request is invalid.", details: z.flattenError(error) },
    { status: 400 },
  );
}

export async function handleGetWasteMap(
  request: Request,
  dependencies: WasteMapHandlerDependencies = {},
) {
  const url = new URL(request.url);
  const parsed = wasteMapQuerySchema.safeParse({
    west: url.searchParams.get("west"),
    south: url.searchParams.get("south"),
    east: url.searchParams.get("east"),
    north: url.searchParams.get("north"),
    zoom: url.searchParams.get("zoom"),
    window: url.searchParams.get("window") ?? undefined,
    wasteType: url.searchParams.get("wasteType") || undefined,
  });

  if (!parsed.success) return validationError(parsed.error);

  const demoMode = dependencies.demoMode
    ?? process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE !== "false";
  if (demoMode && !dependencies.loadRows) {
    return Response.json(createDemoWasteResponse(parsed.data), {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  }

  try {
    const now = dependencies.now?.() ?? new Date();
    const rows = dependencies.loadRows
      ? await dependencies.loadRows(parsed.data)
      : await loadWasteMapRows(parsed.data, now);
    return Response.json(rowsToWasteMapResponse(rows, parsed.data.zoom, now.toISOString()), {
      headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("Waste map data query failed", error);
    return Response.json({ error: "Waste density data is temporarily unavailable." }, { status: 503 });
  }
}
