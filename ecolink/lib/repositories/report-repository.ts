import { prisma, type DbClient, type PaginationInput, paginate } from "@/lib/db";
import type { ImpactScopeType, Prisma } from "@/lib/generated/prisma/client";

export interface ImpactScope {
  scopeType: ImpactScopeType;
  scopeId: string;
}

export class ReportRepository {
  constructor(private readonly db: DbClient = prisma) {}

  createImpactRecord(data: Prisma.ImpactRecordUncheckedCreateInput) {
    return this.db.impactRecord.create({ data });
  }

  summarizeImpact(scope: ImpactScope) {
    return this.db.impactRecord.aggregate({
      where: scope,
      _sum: {
        weightKg: true,
        co2eSavedKg: true,
        landfillDivertedKg: true,
      },
      _count: true,
    });
  }

  listImpactRecords(scope: ImpactScope, input: PaginationInput = {}) {
    const { skip, take } = paginate(input);

    return this.db.impactRecord.findMany({
      where: scope,
      include: { materialCategory: true },
      orderBy: { recordedAt: "desc" },
      skip,
      take,
    });
  }

  createAuditLog(data: Prisma.AuditLogUncheckedCreateInput) {
    return this.db.auditLog.create({ data });
  }

  listAuditLogs(input: PaginationInput = {}) {
    const { skip, take } = paginate(input);

    return this.db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }
}
