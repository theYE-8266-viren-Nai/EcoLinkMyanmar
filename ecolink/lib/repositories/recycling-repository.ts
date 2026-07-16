import { activeRecord, paginate, prisma, type DbClient, type PaginationInput } from "@/lib/db";
import type { Prisma, RecyclingRequestStatus } from "@/lib/generated/prisma/client";

export interface RecyclingRequestFilters extends PaginationInput {
  requesterId?: string;
  assignedOrganizationId?: string;
  status?: RecyclingRequestStatus;
}

export class RecyclingRepository {
  constructor(private readonly db: DbClient = prisma) {}

  listMaterialCategories(activeOnly = true) {
    return this.db.materialCategory.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });
  }

  createRequest(data: Prisma.RecyclingRequestCreateInput) {
    return this.db.recyclingRequest.create({
      data,
      include: { items: true },
    });
  }

  listRequests(filters: RecyclingRequestFilters = {}) {
    const { skip, take } = paginate(filters);

    return this.db.recyclingRequest.findMany({
      where: {
        ...activeRecord,
        requesterId: filters.requesterId,
        assignedOrganizationId: filters.assignedOrganizationId,
        status: filters.status,
      },
      include: {
        requester: true,
        address: true,
        items: { include: { materialCategory: true } },
        pickup: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  findRequestById(id: string) {
    return this.db.recyclingRequest.findFirst({
      where: { id, ...activeRecord },
      include: {
        requester: true,
        address: true,
        assignedOrganization: true,
        items: { include: { materialCategory: true } },
        pickup: true,
      },
    });
  }

  updateRequestStatus(id: string, status: RecyclingRequestStatus) {
    return this.db.recyclingRequest.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
      },
    });
  }

  createPickup(data: Prisma.PickupUncheckedCreateInput) {
    return this.db.pickup.create({ data });
  }

  softDeleteRequest(id: string) {
    return this.db.recyclingRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
