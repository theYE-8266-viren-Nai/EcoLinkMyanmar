import { NextResponse } from "next/server";
import { z } from "zod";

import {
  routeRequestIdSchema,
  submitRouteRequestSchema,
  updateCenterDropoffRouteRequestSchema,
  updatePickupRouteRequestSchema,
} from "@/features/recycling-routes/schemas/recycling-route";
import { createRecyclingRouteWorkflowService, RecyclingRouteWorkflowError, type RecyclingRouteWorkflowService } from "@/features/recycling-routes/services/recycling-route-service";
import { sanitizeErrorMessage } from "@/lib/errors";

type HandlerDependencies = {
  service?: RecyclingRouteWorkflowService;
};

async function getService(dependencies: HandlerDependencies) {
  return dependencies.service ?? createRecyclingRouteWorkflowService();
}

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "The request is invalid.", details: z.flattenError(error) },
    { status: 400 },
  );
}

function safeError(error: unknown) {
  console.error("[recycling-routes] Request failed", error);
  if (error instanceof RecyclingRouteWorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes("could not find the function") ||
      lowerMessage.includes("schema cache") ||
      lowerMessage.includes("pgrst202")
    ) {
      return NextResponse.json(
        { error: "Recycling routes are not configured yet. Apply the latest Supabase migrations and try again." },
        { status: 503 },
      );
    }
    const message = sanitizeErrorMessage(error.message, "The recycling route request could not be completed.");
    return NextResponse.json(
      { error: message },
      { status: message.toLowerCase().includes("already submitted") ? 409 : 500 },
    );
  }
  return NextResponse.json({ error: "The recycling route request could not be completed." }, { status: 500 });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new RecyclingRouteWorkflowError("Request body must be valid JSON.", 400);
  }
}

export async function handleGetCurrentRouteSubmission(_request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const service = await getService(dependencies);
    const [submission, schedule] = await Promise.all([
      service.getCurrentSubmission(),
      service.getUpcomingSchedule(),
    ]);
    return NextResponse.json({ submission, schedule });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleSubmitRouteRequest(request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const parsed = submitRouteRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    const result = await service.submitRouteRequest(parsed.data);
    return NextResponse.json({ request: result }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleListAdminRouteRequests(_request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const service = await getService(dependencies);
    const [requests, routing] = await Promise.all([
      service.listAdminRequests(),
      service.getAdminRoutingDashboard(),
    ]);
    return NextResponse.json({ requests, routing });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleUpdatePickupRouteRequest(request: Request, requestId: string, dependencies: HandlerDependencies = {}) {
  try {
    const id = routeRequestIdSchema.safeParse(requestId);
    if (!id.success) return validationError(id.error);
    const parsed = updatePickupRouteRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    const result = await service.updatePickupRequest(id.data, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeError(error);
  }
}

const routePlanActionSchema = z.object({ action: z.enum(["dispatch", "unlock", "replan"]) });

export async function handlePickupRoutePlanAction(request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const parsed = routePlanActionSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    if (parsed.data.action === "dispatch") {
      await service.dispatchPickupRoutes();
      return NextResponse.json({ ok: true });
    }
    const result = parsed.data.action === "unlock"
      ? await service.unlockPickupRoutes()
      : await service.replanPickupRoutes();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleUpdateCenterDropoffRouteRequest(request: Request, requestId: string, dependencies: HandlerDependencies = {}) {
  try {
    const id = routeRequestIdSchema.safeParse(requestId);
    if (!id.success) return validationError(id.error);
    const parsed = updateCenterDropoffRouteRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    await service.updateCenterDropoffRequest(id.data, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleDeletePickupRouteRequest(requestId: string, dependencies: HandlerDependencies = {}) {
  try {
    const id = routeRequestIdSchema.safeParse(requestId);
    if (!id.success) return validationError(id.error);
    const service = await getService(dependencies);
    await service.deletePickupRequest(id.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleDeleteCenterDropoffRouteRequest(requestId: string, dependencies: HandlerDependencies = {}) {
  try {
    const id = routeRequestIdSchema.safeParse(requestId);
    if (!id.success) return validationError(id.error);
    const service = await getService(dependencies);
    await service.deleteCenterDropoffRequest(id.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}
