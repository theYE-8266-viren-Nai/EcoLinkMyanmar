import { NextResponse } from "next/server";
import { z } from "zod";

import { reportIdSchema, rejectReportSchema, submitReportLocationSchema, type SubmitReportInput } from "@/features/reports/schemas/report";
import { createReportWorkflowService, ReportWorkflowError, type ReportWorkflowService } from "@/features/reports/services/report-service";
import { AiScannerRequestError } from "@/lib/services/ai-scanner-errors";
import { readSingleImageFromMultipartRequest } from "@/lib/services/uploaded-image";

type HandlerDependencies = {
  service?: ReportWorkflowService;
};

async function getService(dependencies: HandlerDependencies) {
  return dependencies.service ?? createReportWorkflowService();
}

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "The request is invalid.", details: z.flattenError(error) },
    { status: 400 },
  );
}

function safeError(error: unknown) {
  if (error instanceof ReportWorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof AiScannerRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Error) {
    console.error("Report workflow request failed", error);
    return NextResponse.json({ error: "The report request could not be completed." }, { status: 500 });
  }
  return NextResponse.json({ error: "The report request could not be completed." }, { status: 500 });
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ReportWorkflowError("Request body must be valid JSON.", 400);
  }
}

function getSingleTextField(formData: FormData, field: string) {
  const values = formData.getAll(field);
  if (values.length !== 1) throw new AiScannerRequestError(`The ${field} field is required.`);
  const value = values[0];
  if (value instanceof File) throw new AiScannerRequestError(`The ${field} field must be text.`);
  return value;
}

async function readSubmitReportInput(request: Request): Promise<SubmitReportInput> {
  const maxUploadMb = Number(process.env.REPORT_IMAGE_MAX_UPLOAD_MB ?? process.env.AI_SCANNER_MAX_UPLOAD_MB ?? 10);
  const { file, formData } = await readSingleImageFromMultipartRequest(request, maxUploadMb * 1024 * 1024);

  const allowedKeys = new Set(["image", "latitude", "longitude"]);
  for (const key of formData.keys()) {
    if (!allowedKeys.has(key)) throw new AiScannerRequestError(`Unexpected field: ${key}.`);
  }

  const parsed = submitReportLocationSchema.safeParse({
    latitude: getSingleTextField(formData, "latitude"),
    longitude: getSingleTextField(formData, "longitude"),
  });
  if (!parsed.success) throw parsed.error;

  const latitude = Number(parsed.data.latitude.toFixed(6));
  const longitude = Number(parsed.data.longitude.toFixed(6));
  return {
    latitude,
    longitude,
    image: file,
  };
}

export async function handleSubmitReport(request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const input = await readSubmitReportInput(request);
    const service = await getService(dependencies);
    const report = await service.submitReport(input);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error);
    return safeError(error);
  }
}

export async function handleListMemberReports(_request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const service = await getService(dependencies);
    const reports = await service.listMemberReports();
    return NextResponse.json({ reports });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleListPendingReports(_request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const service = await getService(dependencies);
    const reports = await service.listPendingReports();
    return NextResponse.json({ reports });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleApproveReport(reportId: string, dependencies: HandlerDependencies = {}) {
  try {
    const parsed = reportIdSchema.safeParse(reportId);
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    await service.approveReport(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleRejectReport(request: Request, reportId: string, dependencies: HandlerDependencies = {}) {
  try {
    const id = reportIdSchema.safeParse(reportId);
    if (!id.success) return validationError(id.error);
    const parsed = rejectReportSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    await service.rejectReport(id.data, parsed.data.reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeError(error);
  }
}

export async function handleClaimReportPoints(reportId: string, dependencies: HandlerDependencies = {}) {
  try {
    const parsed = reportIdSchema.safeParse(reportId);
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    const claim = await service.claimReportPoints(parsed.data);
    return NextResponse.json({ claim });
  } catch (error) {
    return safeError(error);
  }
}
