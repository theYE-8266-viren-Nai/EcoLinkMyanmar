import { z } from "zod";

import { collectorLocationSchema, type CollectorLocationInput } from "@/features/live-map/schemas/map";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface PublishResult {
  ok: boolean;
  reason?: "unauthenticated" | "forbidden";
}

export interface CollectorLocationHandlerDependencies {
  publish?: (input: CollectorLocationInput) => Promise<PublishResult>;
}

async function publishCollectorLocation(input: CollectorLocationInput): Promise<PublishResult> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, reason: "unauthenticated" };

  type CollectorVehicleLocationInsert = Database["public"]["Tables"]["collector_vehicle_locations"]["Insert"];
  type CollectorLocationTable = {
    upsert: (
      values: CollectorVehicleLocationInsert,
      options?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
  const collectorLocations = supabase.from("collector_vehicle_locations") as unknown as CollectorLocationTable;
  const { error } = await collectorLocations.upsert({
    vehicle_id: input.vehicleId,
    latitude: input.latitude,
    longitude: input.longitude,
    heading: input.heading,
    speed_kph: input.speedKph,
    status: input.status,
    observed_at: input.observedAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "vehicle_id" });

  if (error) {
    console.error("Collector location publish denied", error);
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true };
}

export async function handlePublishCollectorLocation(
  request: Request,
  dependencies: CollectorLocationHandlerDependencies = {},
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = collectorLocationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "The collector location is invalid.", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }

  const result = await (dependencies.publish ?? publishCollectorLocation)(parsed.data);
  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 403;
    return Response.json(
      { error: status === 401 ? "Authentication is required." : "You cannot update this vehicle." },
      { status },
    );
  }

  return new Response(null, { status: 204 });
}
