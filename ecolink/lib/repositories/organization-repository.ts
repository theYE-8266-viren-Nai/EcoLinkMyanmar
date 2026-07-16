import { activeRecord, paginate, prisma, type DbClient, type PaginationInput } from "@/lib/db";
import type { MembershipStatus, OrganizationType, Prisma, VerificationStatus } from "@/lib/generated/prisma/client";

export interface OrganizationFilters extends PaginationInput {
  organizationType?: OrganizationType;
  verificationStatus?: VerificationStatus;
}

export class OrganizationRepository {
  constructor(private readonly db: DbClient = prisma) {}

  findBySlug(slug: string) {
    return this.db.organization.findFirst({
      where: { slug, ...activeRecord },
      include: {
        acceptedMaterials: { include: { materialCategory: true } },
      },
    });
  }

  list(filters: OrganizationFilters = {}) {
    const { skip, take } = paginate(filters);

    return this.db.organization.findMany({
      where: {
        ...activeRecord,
        organizationType: filters.organizationType,
        verificationStatus: filters.verificationStatus,
      },
      orderBy: { name: "asc" },
      skip,
      take,
    });
  }

  create(data: Prisma.OrganizationCreateInput) {
    return this.db.organization.create({ data });
  }

  update(id: string, data: Prisma.OrganizationUpdateInput) {
    return this.db.organization.update({
      where: { id },
      data,
    });
  }

  softDelete(id: string) {
    return this.db.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listMemberships(organizationId: string, status?: MembershipStatus) {
    return this.db.organizationMembership.findMany({
      where: { organizationId, status },
      include: { userProfile: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findActiveMembership(organizationId: string, userProfileId: string) {
    return this.db.organizationMembership.findFirst({
      where: {
        organizationId,
        userProfileId,
        status: "ACTIVE",
      },
    });
  }

  submitVerification(data: Prisma.OrganizationVerificationUncheckedCreateInput) {
    return this.db.organizationVerification.create({ data });
  }

  setAcceptedMaterial(data: Prisma.OrganizationAcceptedMaterialUncheckedCreateInput) {
    return this.db.organizationAcceptedMaterial.upsert({
      where: {
        organizationId_materialCategoryId: {
          organizationId: data.organizationId,
          materialCategoryId: data.materialCategoryId,
        },
      },
      create: data,
      update: {
        minimumWeightKg: data.minimumWeightKg,
        maximumWeightKg: data.maximumWeightKg,
        notes: data.notes,
        isActive: data.isActive ?? true,
      },
    });
  }
}
