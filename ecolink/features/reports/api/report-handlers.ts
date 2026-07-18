import { NextResponse } from "next/server";
import { z } from "zod";

import { reportIdSchema, rejectReportSchema, submitReportSchema } from "@/features/reports/schemas/report";
import { createReportWorkflowService, ReportWorkflowError, type ReportWorkflowService } from "@/features/reports/services/report-service";

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
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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

export async function handleSubmitReport(request: Request, dependencies: HandlerDependencies = {}) {
  try {
    const parsed = submitReportSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const service = await getService(dependencies);
    const report = await service.submitReport(parsed.data);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
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
