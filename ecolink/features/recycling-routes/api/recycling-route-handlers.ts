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
    const submission = await service.getCurrentSubmission();
    return NextResponse.json({ submission });
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
    const requests = await service.listAdminRequests();
    return NextResponse.json({ requests });
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
    await service.updatePickupRequest(id.data, parsed.data);
    return NextResponse.json({ ok: true });
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
