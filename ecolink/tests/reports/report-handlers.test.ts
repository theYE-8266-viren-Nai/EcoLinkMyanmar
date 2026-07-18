import { describe, expect, it, vi } from "vitest";

import {
  handleApproveReport,
  handleClaimReportPoints,
  handleListPendingReports,
  handleSubmitReport,
} from "@/features/reports/api/report-handlers";
import { ReportWorkflowError, type ReportWorkflowService } from "@/features/reports/services/report-service";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reportFormRequest(fields: { image?: File; latitude?: string; longitude?: string } = {}) {
  const formData = new FormData();
  if (fields.image) formData.set("image", fields.image);
  if (fields.latitude) formData.set("latitude", fields.latitude);
  if (fields.longitude) formData.set("longitude", fields.longitude);

  return new Request("http://localhost/api/reports", {
    method: "POST",
    body: formData,
  });
}

function pngFile() {
  return new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
    "drain.png",
    { type: "image/png" },
  );
}

function service(overrides: Partial<ReportWorkflowService> = {}): ReportWorkflowService {
  return {
    submitReport: vi.fn(async () => ({ report_id: "report-1", status: "PENDING", created_at: "2026-07-18T00:00:00Z" })),
    listMemberReports: vi.fn(async () => []),
    listPendingReports: vi.fn(async () => []),
    approveReport: vi.fn(async () => undefined),
    rejectReport: vi.fn(async () => undefined),
    claimReportPoints: vi.fn(async () => ({ reportId: "report-1", pointsAwarded: 50, claimedAt: "2026-07-18T00:00:00Z" })),
    ...overrides,
  };
}

describe("report workflow handlers", () => {
  it("submits reports as pending without returning awarded points", async () => {
    const fakeService = service();
    const response = await handleSubmitReport(
      reportFormRequest({ image: pngFile(), latitude: "16.8409", longitude: "96.1735" }),
      { service: fakeService },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      report: { report_id: "report-1", status: "PENDING", created_at: "2026-07-18T00:00:00Z" },
    });
    expect(fakeService.submitReport).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 16.8409,
        longitude: 96.1735,
        image: expect.any(File),
      }),
    );
  });

  it("rejects invalid submit payloads", async () => {
    const response = await handleSubmitReport(jsonRequest({ latitude: "16.8409", longitude: "96.1735" }), { service: service() });

    expect(response.status).toBe(400);
  });

  it("protects pending report listing through the service", async () => {
    const response = await handleListPendingReports(new Request("http://localhost/api/admin/reports"), {
      service: service({
        listPendingReports: vi.fn(async () => {
          throw new ReportWorkflowError("Admin access required.", 403);
        }),
      }),
    });

    expect(response.status).toBe(403);
  });

  it("validates report IDs before approval or claim", async () => {
    const approve = await handleApproveReport("not-a-uuid", { service: service() });
    const claim = await handleClaimReportPoints("not-a-uuid", { service: service() });

    expect(approve.status).toBe(400);
    expect(claim.status).toBe(400);
  });

  it("returns claim result for approved unclaimed reports", async () => {
    const response = await handleClaimReportPoints("80000000-0000-0000-0000-000000000002", { service: service() });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claim: { reportId: "report-1", pointsAwarded: 50, claimedAt: "2026-07-18T00:00:00Z" },
    });
  });
});
